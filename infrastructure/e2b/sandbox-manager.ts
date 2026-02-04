/**
 * E2B Sandbox Manager for Kulti
 * 
 * Manages isolated sandbox environments for AI agents.
 * Each agent gets their own Linux VM with Node.js, npm, git, etc.
 */

import { Sandbox } from 'e2b';

export interface AgentSandbox {
  id: string;
  agentId: string;
  agentName: string;
  sandbox: Sandbox;
  previewUrl: string | null;
  previewPort: number;
  createdAt: Date;
  status: 'starting' | 'running' | 'stopped' | 'error';
}

export interface SandboxConfig {
  agentId: string;
  agentName: string;
  template?: string;
  timeout?: number;
  previewPort?: number;
}

// Active sandboxes
const sandboxes = new Map<string, AgentSandbox>();

/**
 * Create a new sandbox for an agent
 */
export async function createSandbox(config: SandboxConfig): Promise<AgentSandbox> {
  const { 
    agentId, 
    agentName, 
    template = 'base',
    timeout = 3600000,
    previewPort = 3000 
  } = config;

  console.log(`[E2B] Creating sandbox for agent: ${agentName} (${agentId})`);

  try {
    // Create E2B sandbox
    const sandbox = await Sandbox.create(template, {
      timeoutMs: timeout,
    });

    console.log(`[E2B] Sandbox created: ${sandbox.sandboxId}`);

    // Set up the workspace
    await sandbox.commands.run('mkdir -p /home/user/workspace');

    // Get the preview URL
    let previewUrl: string | null = null;
    try {
      previewUrl = sandbox.getHost(previewPort);
      if (previewUrl) {
        previewUrl = `https://${previewUrl}`;
      }
      console.log(`[E2B] Preview host: ${previewUrl}`);
    } catch (e) {
      console.log(`[E2B] Port ${previewPort} not available yet`);
    }

    const agentSandbox: AgentSandbox = {
      id: sandbox.sandboxId,
      agentId,
      agentName,
      sandbox,
      previewUrl,
      previewPort,
      createdAt: new Date(),
      status: 'running',
    };

    sandboxes.set(agentId, agentSandbox);
    return agentSandbox;

  } catch (error) {
    console.error(`[E2B] Failed to create sandbox:`, error);
    throw error;
  }
}

/**
 * Get an existing sandbox by agent ID
 */
export function getSandbox(agentId: string): AgentSandbox | undefined {
  return sandboxes.get(agentId);
}

/**
 * Execute a command in an agent's sandbox
 */
export async function executeCommand(
  agentId: string, 
  command: string
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const agentSandbox = sandboxes.get(agentId);
  if (!agentSandbox) {
    throw new Error(`No sandbox found for agent: ${agentId}`);
  }

  console.log(`[E2B] Executing in ${agentId}: ${command}`);

  const result = await agentSandbox.sandbox.commands.run(command);
  
  return {
    stdout: result.stdout,
    stderr: result.stderr,
    exitCode: result.exitCode,
  };
}

/**
 * Write a file in the sandbox
 */
export async function writeFile(
  agentId: string,
  path: string,
  content: string
): Promise<void> {
  const agentSandbox = sandboxes.get(agentId);
  if (!agentSandbox) {
    throw new Error(`No sandbox found for agent: ${agentId}`);
  }

  await agentSandbox.sandbox.files.write(path, content);
  console.log(`[E2B] Wrote file: ${path}`);
}

/**
 * Read a file from the sandbox
 */
export async function readFile(
  agentId: string,
  path: string
): Promise<string> {
  const agentSandbox = sandboxes.get(agentId);
  if (!agentSandbox) {
    throw new Error(`No sandbox found for agent: ${agentId}`);
  }

  const content = await agentSandbox.sandbox.files.read(path);
  return content;
}

/**
 * Start a dev server in the sandbox and get the preview URL
 */
export async function startDevServer(
  agentId: string,
  command: string = 'npm run dev',
  port: number = 3000
): Promise<string> {
  const agentSandbox = sandboxes.get(agentId);
  if (!agentSandbox) {
    throw new Error(`No sandbox found for agent: ${agentId}`);
  }

  console.log(`[E2B] Starting dev server for ${agentId}: ${command}`);

  // Run the dev server in background
  agentSandbox.sandbox.commands.run(`${command}`, { background: true });

  // Wait for server to start
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Get the public URL
  const host = agentSandbox.sandbox.getHost(port);
  const previewUrl = `https://${host}`;
  
  agentSandbox.previewUrl = previewUrl;
  console.log(`[E2B] Dev server running at: ${previewUrl}`);

  return previewUrl;
}

/**
 * Clone a git repo into the sandbox
 */
export async function cloneRepo(
  agentId: string,
  repoUrl: string,
  path: string = 'workspace'
): Promise<void> {
  await executeCommand(agentId, `git clone ${repoUrl} ${path}`);
}

/**
 * Install npm packages
 */
export async function npmInstall(
  agentId: string,
  packages?: string[]
): Promise<void> {
  const cmd = packages 
    ? `npm install ${packages.join(' ')}`
    : 'npm install';
  await executeCommand(agentId, cmd);
}

/**
 * Stop and destroy a sandbox
 */
export async function destroySandbox(agentId: string): Promise<void> {
  const agentSandbox = sandboxes.get(agentId);
  if (!agentSandbox) {
    return;
  }

  console.log(`[E2B] Destroying sandbox for ${agentId}`);
  
  try {
    await agentSandbox.sandbox.kill();
  } catch (e) {
    console.error(`[E2B] Error destroying sandbox:`, e);
  }

  sandboxes.delete(agentId);
}

/**
 * List all active sandboxes
 */
export function listSandboxes(): AgentSandbox[] {
  return Array.from(sandboxes.values());
}

/**
 * Cleanup all sandboxes (call on shutdown)
 */
export async function cleanupAll(): Promise<void> {
  console.log(`[E2B] Cleaning up ${sandboxes.size} sandboxes...`);
  
  const promises = Array.from(sandboxes.keys()).map(destroySandbox);
  await Promise.all(promises);
  
  console.log(`[E2B] Cleanup complete`);
}

// Cleanup on process exit
process.on('SIGINT', async () => {
  await cleanupAll();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await cleanupAll();
  process.exit(0);
});
