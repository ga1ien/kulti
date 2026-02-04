/**
 * OpenClaw → Kulti Bridge
 * 
 * This module bridges OpenClaw agent activity to Kulti streaming.
 * It captures terminal output, thinking, and file changes.
 * 
 * Usage from OpenClaw:
 *   Import this and call the push functions
 */

const KULTI_STATE_SERVER = process.env.KULTI_STATE_SERVER || 'http://localhost:8766';
const KULTI_API = process.env.KULTI_API || 'https://kulti.club/api';

export interface TerminalLine {
  type: 'command' | 'output' | 'error' | 'success' | 'info';
  content: string;
  timestamp?: string;
}

export interface KultiState {
  agentId: string;
  agentName?: string;
  agentAvatar?: string;
  status?: 'starting' | 'working' | 'thinking' | 'paused' | 'done';
  task?: { title: string; description?: string };
  terminal?: TerminalLine[];
  terminalAppend?: boolean;
  thinking?: string;
  preview?: { url?: string; domain?: string };
  stats?: { files?: number; commands?: number };
}

/**
 * Push state to Kulti
 */
export async function pushToKulti(state: KultiState): Promise<boolean> {
  try {
    const response = await fetch(KULTI_STATE_SERVER, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state),
    });
    return response.ok;
  } catch (error) {
    console.error('[Kulti] Failed to push state:', error);
    return false;
  }
}

/**
 * Push terminal line(s)
 */
export async function pushTerminal(agentId: string, lines: TerminalLine | TerminalLine[]): Promise<void> {
  await pushToKulti({
    agentId,
    terminal: Array.isArray(lines) ? lines : [lines],
    terminalAppend: true,
  });
}

/**
 * Push a command
 */
export async function pushCommand(agentId: string, command: string): Promise<void> {
  await pushTerminal(agentId, { type: 'command', content: command });
}

/**
 * Push command output
 */
export async function pushOutput(agentId: string, output: string, type: 'output' | 'error' | 'success' | 'info' = 'output'): Promise<void> {
  await pushTerminal(agentId, { type, content: output });
}

/**
 * Push thinking/reasoning
 */
export async function pushThinking(agentId: string, thinking: string): Promise<void> {
  await pushToKulti({
    agentId,
    thinking,
    status: 'thinking',
  });
}

/**
 * Set current task
 */
export async function setTask(agentId: string, title: string): Promise<void> {
  await pushToKulti({
    agentId,
    task: { title },
    status: 'working',
  });
}

/**
 * Set status
 */
export async function setStatus(agentId: string, status: KultiState['status']): Promise<void> {
  await pushToKulti({ agentId, status });
}

/**
 * Stream class for easier usage
 */
export class KultiStream {
  private agentId: string;
  private commandCount = 0;
  private fileCount = 0;

  constructor(agentId: string, agentName?: string, agentAvatar?: string) {
    this.agentId = agentId;
    // Initialize
    pushToKulti({
      agentId,
      agentName,
      agentAvatar,
      status: 'starting',
    });
  }

  async start(task: string): Promise<void> {
    await pushToKulti({
      agentId: this.agentId,
      task: { title: task },
      status: 'working',
      stats: { files: 0, commands: 0 },
    });
  }

  async command(cmd: string): Promise<void> {
    this.commandCount++;
    await pushToKulti({
      agentId: this.agentId,
      terminal: [{ type: 'command', content: cmd }],
      terminalAppend: true,
      stats: { commands: this.commandCount, files: this.fileCount },
    });
  }

  async output(text: string, type: TerminalLine['type'] = 'output'): Promise<void> {
    await pushTerminal(this.agentId, { type, content: text });
  }

  async think(content: string): Promise<void> {
    await pushThinking(this.agentId, content);
  }

  async fileEdited(): Promise<void> {
    this.fileCount++;
    await pushToKulti({
      agentId: this.agentId,
      stats: { files: this.fileCount, commands: this.commandCount },
    });
  }

  async stop(): Promise<void> {
    await setStatus(this.agentId, 'done');
  }
}

// Pre-configured stream for Nex
export const nex = new KultiStream('nex', 'Nex', '⚡');
