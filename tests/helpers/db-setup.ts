import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Create a Supabase admin client for test database operations
 */
export function createTestClient() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Test user data interface
 */
export interface TestUser {
  id: string;
  phone: string;
  full_name: string;
  username: string;
  email?: string;
  role: 'user' | 'admin' | 'host';
  credits: number;
  total_invites: number;
}

/**
 * Create a test user in the database
 */
export async function createTestUser(
  userData: Partial<TestUser> & { phone: string }
): Promise<TestUser> {
  const supabase = createTestClient();

  // Generate unique identifiers
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(7);

  const defaultUser: TestUser = {
    id: `test-user-${randomId}`,
    phone: userData.phone,
    full_name: userData.full_name || `Test User ${randomId}`,
    username: userData.username || `testuser${randomId}`,
    email: userData.email,
    role: userData.role || 'user',
    credits: userData.credits ?? 100,
    total_invites: userData.total_invites ?? 3,
  };

  // Insert user into profiles table
  const { data, error } = await supabase
    .from('profiles')
    .insert({
      id: defaultUser.id,
      phone: defaultUser.phone,
      full_name: defaultUser.full_name,
      username: defaultUser.username,
      email: defaultUser.email,
      role: defaultUser.role,
      credits: defaultUser.credits,
      total_invites: defaultUser.total_invites,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create test user: ${error.message}`);
  }

  return defaultUser;
}

/**
 * Create a test invite code
 */
export async function createTestInviteCode(
  code: string,
  createdBy?: string
): Promise<string> {
  const supabase = createTestClient();

  const { error } = await supabase.from('invite_codes').insert({
    code,
    created_by: createdBy,
    used: false,
    created_at: new Date().toISOString(),
  });

  if (error) {
    throw new Error(`Failed to create test invite code: ${error.message}`);
  }

  return code;
}

/**
 * Create a test session
 */
export async function createTestSession(sessionData: {
  host_id: string;
  title: string;
  description?: string;
  scheduled_for?: string;
  room_id?: string;
}): Promise<string> {
  const supabase = createTestClient();

  const { data, error } = await supabase
    .from('sessions')
    .insert({
      host_id: sessionData.host_id,
      title: sessionData.title,
      description: sessionData.description,
      scheduled_for: sessionData.scheduled_for,
      room_id: sessionData.room_id || `test-room-${Date.now()}`,
      status: 'scheduled',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create test session: ${error.message}`);
  }

  return data.id;
}

/**
 * Add credits to a user
 */
export async function addCreditsToUser(
  userId: string,
  amount: number,
  reason: string
): Promise<void> {
  const supabase = createTestClient();

  // Update user credits
  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      credits: amount,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (updateError) {
    throw new Error(`Failed to update user credits: ${updateError.message}`);
  }

  // Record transaction
  const { error: transactionError } = await supabase
    .from('credit_transactions')
    .insert({
      user_id: userId,
      amount,
      type: 'earned',
      description: reason,
      created_at: new Date().toISOString(),
    });

  if (transactionError) {
    throw new Error(
      `Failed to record credit transaction: ${transactionError.message}`
    );
  }
}

/**
 * Clean up test data
 */
export async function cleanupTestData(userIds: string[]): Promise<void> {
  const supabase = createTestClient();

  // Delete in reverse order of dependencies
  await supabase.from('credit_transactions').delete().in('user_id', userIds);
  await supabase.from('session_participants').delete().in('user_id', userIds);
  await supabase
    .from('sessions')
    .delete()
    .in('host_id', userIds)
    .or(userIds.map((id) => `host_id.eq.${id}`).join(','));
  await supabase.from('invite_codes').delete().in('created_by', userIds);
  await supabase.from('profiles').delete().in('id', userIds);
}

/**
 * Clean up test sessions
 */
export async function cleanupTestSessions(sessionIds: string[]): Promise<void> {
  const supabase = createTestClient();

  await supabase.from('session_participants').delete().in('session_id', sessionIds);
  await supabase.from('sessions').delete().in('id', sessionIds);
}

/**
 * Clean up test invite codes
 */
export async function cleanupTestInviteCodes(codes: string[]): Promise<void> {
  const supabase = createTestClient();

  await supabase.from('invite_codes').delete().in('code', codes);
}

/**
 * Get test user by phone
 */
export async function getTestUserByPhone(phone: string): Promise<TestUser | null> {
  const supabase = createTestClient();

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('phone', phone)
    .single();

  if (error || !data) {
    return null;
  }

  return data as TestUser;
}

/**
 * Setup test database - creates necessary test data
 */
export async function setupTestDatabase(): Promise<{
  users: TestUser[];
  inviteCodes: string[];
}> {
  const users: TestUser[] = [];
  const inviteCodes: string[] = [];

  // Create test invite codes
  const testCodes = ['TEST2025', 'ADMIN2025', 'HOST2025'];
  for (const code of testCodes) {
    await createTestInviteCode(code);
    inviteCodes.push(code);
  }

  // Create test users
  const regularUser = await createTestUser({
    phone: '+15551234567',
    full_name: 'Test User',
    username: 'testuser',
    role: 'user',
    credits: 100,
  });
  users.push(regularUser);

  const adminUser = await createTestUser({
    phone: '+15559999999',
    full_name: 'Admin User',
    username: 'adminuser',
    role: 'admin',
    credits: 1000,
  });
  users.push(adminUser);

  const hostUser = await createTestUser({
    phone: '+15558888888',
    full_name: 'Host User',
    username: 'hostuser',
    role: 'host',
    credits: 500,
  });
  users.push(hostUser);

  return { users, inviteCodes };
}

/**
 * Teardown test database - removes all test data
 */
export async function teardownTestDatabase(
  users: TestUser[],
  inviteCodes: string[]
): Promise<void> {
  const userIds = users.map((u) => u.id);
  await cleanupTestData(userIds);
  await cleanupTestInviteCodes(inviteCodes);
}
