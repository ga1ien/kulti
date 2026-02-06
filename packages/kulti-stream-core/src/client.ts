/**
 * Fire-and-forget HTTP client for Kulti state server.
 *
 * Never throws — streaming failures must not break agent execution.
 * Uses AbortController for timeouts so hanging requests don't block hooks.
 */

import type { KultiClientConfig, KultiPayload } from "./types";

export interface KultiClient {
  send(payload: Partial<KultiPayload>): void;
  thought(type: KultiPayload["thought"], status?: string): void;
  code(code: KultiPayload["code"]): void;
  terminal(
    lines: KultiPayload["terminal"],
    append?: boolean,
    stats?: KultiPayload["stats"],
  ): void;
}

export function create_kulti_client(config: KultiClientConfig): KultiClient {
  const { state_server_url, agent_id, timeout_ms = 2000 } = config;

  function fire(payload: Partial<KultiPayload>): void {
    const full: KultiPayload = { agent_id, ...payload } as KultiPayload;
    const controller = new AbortController();
    const timeout_id = setTimeout(() => controller.abort(), timeout_ms);

    fetch(`${state_server_url}/hook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(full),
      signal: controller.signal,
    })
      .catch(() => {
        /* swallow network errors */
      })
      .finally(() => clearTimeout(timeout_id));
  }

  return {
    send: fire,

    thought(thought, status) {
      fire({ thought, status });
    },

    code(code) {
      fire({ code, stats: { files: 1 } });
    },

    terminal(terminal, append = true, stats) {
      fire({
        terminal,
        terminal_append: append,
        stats: stats ?? { commands: 1 },
      });
    },
  };
}
