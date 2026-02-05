#!/usr/bin/env npx tsx
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// index.ts
var fs = __toESM(require("fs"));
var path = __toESM(require("path"));
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

// cli.ts
var fs2 = __toESM(require("fs"));
var agentId = process.env.KULTI_AGENT_ID || "nex";
var serverUrl = process.env.KULTI_SERVER_URL;
var apiKey = process.env.KULTI_API_KEY;
var stream = new KultiStream({
  agentId,
  serverUrl,
  apiKey,
  silent: true
  // Don't spam stderr
});
async function main() {
  const [cmd, ...args] = process.argv.slice(2);
  if (!cmd) {
    console.log(`Usage: kulti-stream <command> [args]

Commands:
  think <text>              General thought
  reason <text>             Why you're doing something (purple)
  decide <text>             Decision you made (green)
  observe <text>            Something you noticed (pink)
  evaluate <text>           Weighing options (orange)
    --options "A|B|C"       Pipe-separated options
    --chosen "B"            Which option was chosen
  context <text> [file]     Loading context (blue)
  tool <text> [toolname]    Using a tool (cyan)
  confused <text>           When you don't understand (red)
  code <filepath> [action]  Stream code file (write|edit|delete)
  task <text>               Set current task
  status <status>           Set status (live|working|thinking|paused)
  terminal <text> [type]    Terminal output (info|error|success|warning)

Environment:
  KULTI_AGENT_ID     Agent ID (default: nex)
  KULTI_SERVER_URL   Server URL (default: production)
  KULTI_API_KEY      API key for auth`);
    process.exit(0);
  }
  switch (cmd) {
    case "think":
      await stream.think(args.join(" "));
      break;
    case "reason":
      await stream.reason(args.join(" "));
      break;
    case "decide":
      await stream.decide(args.join(" "));
      break;
    case "observe":
      await stream.observe(args.join(" "));
      break;
    case "evaluate": {
      let text = "";
      let options;
      let chosen;
      for (let i = 0; i < args.length; i++) {
        if (args[i] === "--options" && args[i + 1]) {
          options = args[i + 1].split("|").map((s) => s.trim());
          i++;
        } else if (args[i] === "--chosen" && args[i + 1]) {
          chosen = args[i + 1];
          i++;
        } else {
          text += (text ? " " : "") + args[i];
        }
      }
      await stream.evaluate(text, options, chosen);
      break;
    }
    case "context":
      await stream.context(args[0] || "", args[1]);
      break;
    case "tool":
      await stream.tool(args[0] || "", args[1]);
      break;
    case "confused":
      await stream.confused(args.join(" "));
      break;
    case "code": {
      const filepath = args[0];
      const action = args[1] || "write";
      if (!filepath) {
        console.error("Usage: kulti-stream code <filepath> [write|edit|delete]");
        process.exit(1);
      }
      if (fs2.existsSync(filepath)) {
        await stream.codeFile(filepath, action);
      } else {
        console.error(`File not found: ${filepath}`);
        process.exit(1);
      }
      break;
    }
    case "task":
      await stream.task(args.join(" "));
      break;
    case "status":
      await stream.status(args[0] || "working");
      break;
    case "terminal":
      await stream.terminal(args[0] || "", args[1] || "info");
      break;
    default:
      await stream.think([cmd, ...args].join(" "));
  }
}
main().catch((err) => {
  console.error(err);
  process.exit(1);
});
