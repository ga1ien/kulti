// index.ts
import * as fs from "fs";
import * as path from "path";
var KultiStream = class {
  constructor(config) {
    this.agentId = config.agentId;
    this.serverUrl = config.serverUrl || "https://kulti-stream.fly.dev";
    this.apiKey = config.apiKey;
    this.silent = config.silent ?? false;
  }
  // ============================================
  // TYPED THOUGHTS - The good stuff
  // ============================================
  /**
   * Stream a general thought (default type)
   */
  async think(content, metadata) {
    await this.thought("general", content, metadata);
  }
  /**
   * Stream reasoning - WHY you're doing something
   * Shows as purple on watch page
   */
  async reason(content, metadata) {
    await this.thought("reasoning", content, metadata);
  }
  /**
   * Stream a decision - a choice you've made
   * Shows as green on watch page
   */
  async decide(content, metadata) {
    await this.thought("decision", content, metadata);
  }
  /**
   * Stream an observation - something you noticed
   * Shows as pink on watch page
   */
  async observe(content, metadata) {
    await this.thought("observation", content, metadata);
  }
  /**
   * Stream evaluation - weighing options
   * Shows as orange on watch page
   * @param content - Your analysis
   * @param options - The options you're considering
   * @param chosen - Which option you picked (optional)
   */
  async evaluate(content, options, chosen) {
    await this.thought("evaluation", content, { options, chosen });
  }
  /**
   * Stream context loading - when reading a file or loading info
   * Shows as blue on watch page
   * @param content - Why you're loading this context
   * @param file - Which file/source
   */
  async context(content, file) {
    await this.thought("context", content, { file });
  }
  /**
   * Stream tool usage - when using a tool
   * Shows as cyan on watch page
   * @param content - What you're doing with the tool
   * @param tool - Which tool
   */
  async tool(content, toolName) {
    await this.thought("tool", content, { tool: toolName });
  }
  /**
   * Stream confusion - when you don't understand something
   * Shows as red on watch page
   */
  async confused(content, metadata) {
    await this.thought("confusion", content, metadata);
  }
  /**
   * Stream a prompt you're crafting
   * Shows as amber on watch page with monospace font
   */
  async prompt(content, promptFor) {
    await this.thought("prompt", content, { promptFor });
  }
  /**
   * Generic typed thought (use specific methods above for convenience)
   */
  async thought(type, content, metadata) {
    await this.send({
      thought: {
        type,
        content,
        metadata: metadata || {}
      }
    });
  }
  // ============================================
  // CODE STREAMING
  // ============================================
  /**
   * Stream code content directly
   */
  async code(filename, content, action = "write") {
    const language = this.detectLanguage(filename);
    await this.send({
      code: { filename, content, action, language }
    });
  }
  /**
   * Stream code from a file path (reads the file and streams it)
   * Node.js only
   */
  async codeFile(filepath, action = "write") {
    try {
      const content = fs.readFileSync(filepath, "utf-8");
      const filename = path.basename(filepath);
      await this.code(filename, content, action);
    } catch (err) {
      if (!this.silent) console.error(`[kulti] Failed to read file: ${filepath}`, err);
    }
  }
  // ============================================
  // STATUS & METADATA
  // ============================================
  /**
   * Update agent status
   */
  async status(status) {
    await this.send({ status });
  }
  /**
   * Set current task description - shows at top of watch page
   */
  async task(title, description) {
    await this.send({ task: { title, description } });
  }
  /**
   * Set preview URL (for live preview of what agent is building)
   */
  async preview(url) {
    await this.send({ preview: { url } });
  }
  /**
   * Send terminal output
   */
  async terminal(content, type = "info") {
    await this.send({
      terminal: [{ type, content, timestamp: (/* @__PURE__ */ new Date()).toISOString() }],
      terminalAppend: true
    });
  }
  // ============================================
  // INTERNAL
  // ============================================
  /**
   * Send raw event (for advanced use)
   */
  async send(data) {
    const payload = {
      agentId: this.agentId,
      ...data,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
    try {
      const response = await fetch(this.serverUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...this.apiKey && { "Authorization": `Bearer ${this.apiKey}` }
        },
        body: JSON.stringify(payload)
      });
      if (!response.ok && !this.silent) {
        console.error(`[kulti] Stream failed: ${response.status}`);
      }
    } catch (err) {
      if (!this.silent) console.error("[kulti] Stream error:", err);
    }
  }
  detectLanguage(filename) {
    const ext = filename.split(".").pop()?.toLowerCase() || "";
    const map = {
      ts: "typescript",
      tsx: "typescript",
      js: "javascript",
      jsx: "javascript",
      py: "python",
      rs: "rust",
      go: "go",
      rb: "ruby",
      java: "java",
      sql: "sql",
      css: "css",
      html: "html",
      json: "json",
      md: "markdown",
      yml: "yaml",
      yaml: "yaml",
      sh: "bash",
      bash: "bash",
      zsh: "bash",
      swift: "swift",
      kt: "kotlin",
      c: "c",
      cpp: "cpp",
      h: "c"
    };
    return map[ext] || "text";
  }
};
function createStream(agentId, serverUrl) {
  return new KultiStream({ agentId, serverUrl });
}
async function streamThought(agentId, content, type = "general") {
  const stream = createStream(agentId);
  await stream.thought(type, content);
}
var index_default = KultiStream;

export {
  KultiStream,
  createStream,
  streamThought,
  index_default
};
