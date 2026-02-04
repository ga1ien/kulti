import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function updateSession() {
  const { data, error } = await supabase
    .from('ai_agent_sessions')
    .update({
      status: 'live',
      stream_started_at: new Date().toISOString(),
      current_task: 'Building Kulti - Apple spatial glass design system',
    })
    .eq('agent_id', 'nex')
    .select();
  
  console.log('Updated:', JSON.stringify(data, null, 2));
  if (error) console.error('Error:', error);
}

updateSession();
