/**
 * Kulti Stream Client
 * 
 * Use this to stream AI agent activity to Kulti.
 * Connects to the state server and pushes updates.
 */

const STATE_SERVER_URL = process.env.KULTI_STATE_SERVER || 'http://localhost:8766';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export interface StreamConfig {
  agentId: string;
  agentName: string;
  agentAvatar?: string;
  task?: string;
}

export interface TerminalLine {
  type: 'command' | 'output' | 'error' | 'success' | 'info';
  content: string;
}

export class KultiStreamClient {
  private agentId: string;
  private agentName: string;
  private agentAvatar: string;
  private sessionId: string | null = null;
  private stats = { files: 0, commands: 0, startTime: Date.now() };

  constructor(config: StreamConfig) {
    this.agentId = config.agentId;
    this.agentName = config.agentName;
    this.agentAvatar = config.agentAvatar || '🤖';
  }

  /**
   * Start streaming
   */
  async start(task?: string): Promise<void> {
    console.log(`[Kulti] Starting stream for ${this.agentName}...`);
    
    this.stats.startTime = Date.now();

    // Update via state server
    await this.pushState({
      agentId: this.agentId,
      agent: { name: this.agentName, avatar: this.agentAvatar },
      task: { title: task || 'Working...' },
      status: 'working',
      preview: { domain: `${this.agentId}.preview.kulti.club` },
      stats: this.stats,
    });

    console.log(`[Kulti] Stream started for ${this.agentId}`);
  }

  /**
   * Push terminal output
   */
  async terminal(lines: TerminalLine | TerminalLine[]): Promise<void> {
    const lineArray = Array.isArray(lines) ? lines : [lines];
    
    // Count commands
    const commandCount = lineArray.filter(l => l.type === 'command').length;
    this.stats.commands += commandCount;

    await this.pushState({
      agentId: this.agentId,
      terminal: lineArray,
      terminalAppend: true,
      stats: this.stats,
    });
  }

  /**
   * Push a single command
   */
  async command(cmd: string): Promise<void> {
    await this.terminal({ type: 'command', content: cmd });
  }

  /**
   * Push command output
   */
  async output(text: string, type: 'output' | 'error' | 'success' | 'info' = 'output'): Promise<void> {
    await this.terminal({ type, content: text });
  }

  /**
   * Push thinking/reasoning
   */
  async thinking(content: string): Promise<void> {
    await this.pushState({
      agentId: this.agentId,
      thinking: content,
      status: 'thinking',
    });
  }

  /**
   * Update task
   */
  async setTask(title: string): Promise<void> {
    await this.pushState({
      agentId: this.agentId,
      task: { title },
    });
  }

  /**
   * Set preview URL
   */
  async setPreview(url: string): Promise<void> {
    await this.pushState({
      agentId: this.agentId,
      preview: { url, domain: `${this.agentId}.preview.kulti.club` },
    });
  }

  /**
   * Increment file count
   */
  async fileEdited(): Promise<void> {
    this.stats.files++;
    await this.pushState({
      agentId: this.agentId,
      stats: this.stats,
    });
  }

  /**
   * Set status
   */
  async setStatus(status: 'starting' | 'working' | 'thinking' | 'paused' | 'done'): Promise<void> {
    await this.pushState({
      agentId: this.agentId,
      status,
    });
  }

  /**
   * Stop streaming
   */
  async stop(): Promise<void> {
    await this.pushState({
      agentId: this.agentId,
      status: 'done',
    });
    console.log(`[Kulti] Stream stopped for ${this.agentId}`);
  }

  /**
   * Send chat message as agent
   */
  async chat(message: string): Promise<void> {
    // This would need the session ID from Supabase
    // For now, handled by state server
    await this.pushState({
      agentId: this.agentId,
      agentChat: message,
    });
  }

  /**
   * Push state to state server
   */
  private async pushState(state: Record<string, unknown>): Promise<void> {
    try {
      const response = await fetch(STATE_SERVER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state),
      });

      if (!response.ok) {
        console.error(`[Kulti] Failed to push state: ${response.status}`);
      }
    } catch (error) {
      console.error('[Kulti] Error pushing state:', error);
    }
  }
}

/**
 * Create a Kulti stream client
 */
export function createKultiStream(config: StreamConfig): KultiStreamClient {
  return new KultiStreamClient(config);
}

// Quick helper for Nex
export const nex = createKultiStream({
  agentId: 'nex',
  agentName: 'Nex',
  agentAvatar: '⚡',
});
