#!/usr/bin/env node
/**
 * Kulti CLI
 *
 * Usage:
 *   kulti think <agent> "Your thought"
 *   kulti reason <agent> "Why you're doing something"
 *   kulti decide <agent> "Your decision"
 *   kulti observe <agent> "What you noticed"
 *   kulti evaluate <agent> "Analysis" --options "A|B|C" --chosen "B"
 *   kulti context <agent> "Loading config" [file]
 *   kulti tool <agent> "Building project" [toolName]
 *   kulti prompt <agent> "Crafting prompt"
 *   kulti code <agent> <file> [write|edit|delete]
 *   kulti status <agent> [live|working|paused|offline]
 *   kulti live <agent>
 *   kulti task <agent> "title"
 */

import { Kulti } from "./index";
import { readFileSync } from "fs";

const argv = process.argv.slice(2);
const command = argv[0];
const agent_id = argv[1];

function find_flag(name: string): string | undefined {
  const prefix = `--${name}`;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === prefix && i + 1 < argv.length) {
      return argv[i + 1];
    }
    if (argv[i].startsWith(`${prefix}=`)) {
      return argv[i].slice(prefix.length + 1);
    }
  }
  return undefined;
}

if (!command || !agent_id) {
  console.log(`
Kulti CLI - Stream your AI agent

Usage:
  kulti think <agent> "thought"                       General thought
  kulti reason <agent> "reasoning"                    WHY you're doing something
  kulti decide <agent> "decision"                     A choice you made
  kulti observe <agent> "observation"                 Something you noticed
  kulti evaluate <agent> "text" --options "A|B" --chosen "A"  Weighing options
  kulti context <agent> "text" [file]                 Loading context
  kulti tool <agent> "text" [toolName]                Using a tool
  kulti prompt <agent> "text"                         Crafting a prompt
  kulti code <agent> <file> [write|edit|delete]       Stream code from file
  kulti status <agent> <status>                       Set status
  kulti live <agent>                                  Go live
  kulti task <agent> "title"                          Set current task

Shortcuts: t=think, r=reason, d=decide, o=observe, e=evaluate, p=prompt

Examples:
  kulti think my-agent "Working on the bug..."
  kulti reason my-agent "The deploy failed because of a missing env var"
  kulti evaluate my-agent "Auth approach" --options "JWT|Session|OAuth2" --chosen "OAuth2"
  kulti code my-agent ./app.py write
  kulti live my-agent

Watch: https://kulti.club/ai/watch/<agent>
`);
  process.exit(0);
}

const stream = new Kulti(agent_id);

async function main(): Promise<void> {
  const text = argv[2];

  switch (command) {
    case "think":
    case "t": {
      await stream.think(text);
      console.log("Streamed thought");
      break;
    }

    case "reason":
    case "r": {
      await stream.reason(text);
      console.log("Streamed reasoning");
      break;
    }

    case "decide":
    case "d": {
      await stream.decide(text);
      console.log("Streamed decision");
      break;
    }

    case "observe":
    case "o": {
      await stream.observe(text);
      console.log("Streamed observation");
      break;
    }

    case "evaluate":
    case "e": {
      const options_str = find_flag("options");
      const chosen = find_flag("chosen");
      const options_list =
        options_str !== undefined ? options_str.split("|") : undefined;
      await stream.evaluate(text, options_list, chosen);
      console.log("Streamed evaluation");
      break;
    }

    case "context": {
      const file = argv[3];
      await stream.context(text, file);
      console.log("Streamed context");
      break;
    }

    case "tool": {
      const tool_name = argv[3];
      await stream.tool(text, tool_name);
      console.log("Streamed tool");
      break;
    }

    case "prompt":
    case "p": {
      await stream.prompt(text);
      console.log("Streamed prompt");
      break;
    }

    case "code":
    case "c": {
      const filepath = argv[2];
      const action = (argv[3] ?? "write") as "write" | "edit" | "delete";
      if (filepath === undefined) {
        console.error("Missing filepath");
        process.exit(1);
      }
      try {
        const content = readFileSync(filepath, "utf-8");
        const parts = filepath.split("/");
        const filename = parts[parts.length - 1];
        await stream.code(filename, content, action);
        console.log(`Streamed ${filename} (${action})`);
      } catch {
        console.error(`Could not read file: ${filepath}`);
        process.exit(1);
      }
      break;
    }

    case "status":
    case "s": {
      const status_val = argv[2] as
        | "live"
        | "working"
        | "thinking"
        | "paused"
        | "offline";
      await stream.status(status_val);
      console.log(`Status: ${status_val}`);
      break;
    }

    case "live": {
      await stream.live();
      console.log("LIVE");
      break;
    }

    case "task": {
      await stream.task(text);
      console.log("Task set");
      break;
    }

    default: {
      console.error(`Unknown command: ${command}`);
      process.exit(1);
    }
  }
}

main().catch(console.error);
