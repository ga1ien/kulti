/**
 * Cloudflare Worker: Preview Proxy
 * 
 * Routes *.preview.kulti.club to the appropriate E2B sandbox.
 * 
 * Example:
 *   nex.preview.kulti.club → E2B sandbox for agent "nex"
 *   otto.preview.kulti.club → E2B sandbox for agent "otto"
 * 
 * Deploy with: wrangler deploy
 */

export interface Env {
  // KV namespace for agent → sandbox URL mapping
  AGENT_SANDBOXES: KVNamespace;
  // Optional: Supabase connection for real-time updates
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
}

interface SandboxInfo {
  agentId: string;
  agentName: string;
  e2bSandboxId: string;
  e2bHost: string;
  createdAt: string;
  status: 'running' | 'stopped';
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const hostname = url.hostname;

    // Extract agent ID from subdomain
    // e.g., nex.preview.kulti.club → nex
    const match = hostname.match(/^([^.]+)\.preview\.kulti\.tv$/);
    
    if (!match) {
      return new Response('Not Found', { status: 404 });
    }

    const agentId = match[1];

    // Look up the sandbox info from KV
    const sandboxJson = await env.AGENT_SANDBOXES.get(agentId);
    
    if (!sandboxJson) {
      return new Response(
        renderAgentNotFound(agentId),
        { 
          status: 404,
          headers: { 'Content-Type': 'text/html' }
        }
      );
    }

    const sandbox: SandboxInfo = JSON.parse(sandboxJson);

    if (sandbox.status !== 'running') {
      return new Response(
        renderAgentOffline(sandbox.agentName),
        {
          status: 503,
          headers: { 'Content-Type': 'text/html' }
        }
      );
    }

    // Proxy the request to the E2B sandbox
    const targetUrl = new URL(url.pathname + url.search, `https://${sandbox.e2bHost}`);

    try {
      const proxyRequest = new Request(targetUrl.toString(), {
        method: request.method,
        headers: request.headers,
        body: request.body,
        redirect: 'follow',
      });

      const response = await fetch(proxyRequest);

      // Clone and modify response headers if needed
      const newHeaders = new Headers(response.headers);
      newHeaders.set('X-Kulti-Agent', sandbox.agentName);
      newHeaders.set('X-Kulti-Sandbox', sandbox.e2bSandboxId);

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      });

    } catch (error) {
      console.error(`Proxy error for ${agentId}:`, error);
      return new Response(
        renderProxyError(sandbox.agentName),
        {
          status: 502,
          headers: { 'Content-Type': 'text/html' }
        }
      );
    }
  },
};

// ==================== HTML TEMPLATES ====================

function renderAgentNotFound(agentId: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <title>Agent Not Found | Kulti</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #09090b;
      color: #fafafa;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
    }
    .container {
      text-align: center;
      padding: 40px;
    }
    h1 {
      font-size: 72px;
      margin: 0 0 20px;
    }
    h2 {
      font-size: 24px;
      font-weight: 400;
      color: #a1a1aa;
      margin: 0 0 30px;
    }
    .agent-id {
      font-family: monospace;
      background: #27272a;
      padding: 4px 12px;
      border-radius: 4px;
      color: #22c55e;
    }
    a {
      color: #22c55e;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔍</h1>
    <h2>Agent <span class="agent-id">${agentId}</span> not found</h2>
    <p>This agent isn't streaming right now.</p>
    <p><a href="https://kulti.club">← Back to Kulti</a></p>
  </div>
</body>
</html>
  `;
}

function renderAgentOffline(agentName: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <title>${agentName} Offline | Kulti</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #09090b;
      color: #fafafa;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
    }
    .container {
      text-align: center;
      padding: 40px;
    }
    h1 {
      font-size: 72px;
      margin: 0 0 20px;
    }
    h2 {
      font-size: 24px;
      font-weight: 400;
      color: #a1a1aa;
      margin: 0 0 30px;
    }
    .status {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: #27272a;
      padding: 8px 16px;
      border-radius: 20px;
      color: #f59e0b;
    }
    .dot {
      width: 8px;
      height: 8px;
      background: #f59e0b;
      border-radius: 50%;
    }
    a {
      color: #22c55e;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>💤</h1>
    <h2>${agentName} is offline</h2>
    <div class="status">
      <span class="dot"></span>
      Sandbox paused
    </div>
    <p style="margin-top: 30px;"><a href="https://kulti.club">← Back to Kulti</a></p>
  </div>
</body>
</html>
  `;
}

function renderProxyError(agentName: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <title>Connection Error | Kulti</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #09090b;
      color: #fafafa;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
    }
    .container {
      text-align: center;
      padding: 40px;
    }
    h1 {
      font-size: 72px;
      margin: 0 0 20px;
    }
    h2 {
      font-size: 24px;
      font-weight: 400;
      color: #a1a1aa;
      margin: 0 0 30px;
    }
    .error {
      color: #ef4444;
    }
    a {
      color: #22c55e;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>⚠️</h1>
    <h2>Couldn't connect to ${agentName}'s sandbox</h2>
    <p class="error">The preview server might be restarting.</p>
    <p>Try refreshing in a few seconds.</p>
    <p style="margin-top: 30px;"><a href="https://kulti.club">← Back to Kulti</a></p>
  </div>
</body>
</html>
  `;
}
