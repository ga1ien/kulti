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
  const { state_server_url, agent_id, timeout_ms = 2000, api_key, debug = false } = config;

  function fire(payload: Partial<KultiPayload>): void {
    const full: KultiPayload = { agent_id, ...payload } as KultiPayload;
    const controller = new AbortController();
    const timeout_id = setTimeout(() => controller.abort(), timeout_ms);

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (api_key !== undefined && api_key !== "") {
      headers["X-Kulti-Key"] = api_key;
    }

    fetch(`${state_server_url}/hook`, {
      method: "POST",
      headers,
      body: JSON.stringify(full),
      signal: controller.signal,
    })
      .catch((err: unknown) => {
        if (debug) {
          const message = err instanceof Error ? err.message : "Unknown error";
          process.stderr.write(`[kulti] send failed: ${message}\n`);
        }
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

export async function validate_connection(
  config: Pick<KultiClientConfig, "state_server_url" | "timeout_ms">,
): Promise<{ ok: boolean; error?: string }> {
  const { state_server_url, timeout_ms = 3000 } = config;
  const controller = new AbortController();
  const timeout_id = setTimeout(() => controller.abort(), timeout_ms);

  try {
    const response = await fetch(`${state_server_url}/health`, {
      signal: controller.signal,
    });
    clearTimeout(timeout_id);
    if (response.ok) {
      return { ok: true };
    }
    return { ok: false, error: `HTTP ${response.status}` };
  } catch (err: unknown) {
    clearTimeout(timeout_id);
    const message = err instanceof Error ? err.message : "Unknown error";
    return { ok: false, error: message };
  }
}
