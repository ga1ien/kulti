/**
 * AI Workspace State Server
 * 
 * Receives state updates from OpenClaw and broadcasts to the workspace renderer.
 * Also exposes an HTTP API for pushing state updates.
 */

import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';

const PORT = 8765;
const HTTP_PORT = 8766;

// Current state
let currentState = {
  task: {
    title: 'Initializing...',
    description: '',
    status: 'working'
  },
  status: 'Starting',
  terminal: [
    { type: 'output', content: 'Nex workspace starting...' }
  ],
  thinking: '<p>Connecting to OpenClaw...</p>',
  stats: {
    files: 0,
    commands: 0,
    duration: '00:00:00'
  },
  preview: []
};

// Start time for duration tracking
const startTime = Date.now();

// WebSocket server for workspace renderer
const wss = new WebSocketServer({ port: PORT });
const clients: Set<WebSocket> = new Set();

wss.on('connection', (ws) => {
  console.log('Workspace renderer connected');
  clients.add(ws);
  
  // Send current state immediately
  ws.send(JSON.stringify(currentState));
  
  ws.on('close', () => {
    clients.delete(ws);
    console.log('Workspace renderer disconnected');
  });
});

// Broadcast state to all connected clients
function broadcastState() {
  // Update duration
  const elapsed = Date.now() - startTime;
  const hours = Math.floor(elapsed / 3600000);
  const minutes = Math.floor((elapsed % 3600000) / 60000);
  const seconds = Math.floor((elapsed % 60000) / 1000);
  currentState.stats.duration = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  const stateJson = JSON.stringify(currentState);
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(stateJson);
    }
  });
}

// HTTP server for receiving state updates from OpenClaw
const httpServer = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method === 'GET' && req.url === '/state') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(currentState));
    return;
  }

  if (req.method === 'POST' && req.url === '/state') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const update = JSON.parse(body);
        
        // Merge update into current state
        if (update.task) currentState.task = { ...currentState.task, ...update.task };
        if (update.status) currentState.status = update.status;
        if (update.thinking) currentState.thinking = update.thinking;
        if (update.stats) currentState.stats = { ...currentState.stats, ...update.stats };
        if (update.preview) currentState.preview = update.preview;
        
        // Terminal: append or replace
        if (update.terminal) {
          if (update.terminalAppend) {
            currentState.terminal = [...currentState.terminal, ...update.terminal].slice(-50);
          } else {
            currentState.terminal = update.terminal;
          }
        }
        
        broadcastState();
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  // Add terminal line
  if (req.method === 'POST' && req.url === '/terminal') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { type, content } = JSON.parse(body);
        currentState.terminal.push({ type: type || 'output', content });
        currentState.terminal = currentState.terminal.slice(-50); // Keep last 50 lines
        currentState.stats.commands++;
        broadcastState();
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  // Update thinking
  if (req.method === 'POST' && req.url === '/thinking') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { content } = JSON.parse(body);
        currentState.thinking = content;
        broadcastState();
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

httpServer.listen(HTTP_PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║          NEX AI WORKSPACE STATE SERVER                ║
╠═══════════════════════════════════════════════════════╣
║  WebSocket (renderer): ws://localhost:${PORT}            ║
║  HTTP API (updates):   http://localhost:${HTTP_PORT}          ║
╠═══════════════════════════════════════════════════════╣
║  Endpoints:                                           ║
║    GET  /state     - Get current state                ║
║    POST /state     - Update full state                ║
║    POST /terminal  - Add terminal line                ║
║    POST /thinking  - Update thinking panel            ║
╚═══════════════════════════════════════════════════════╝
`);
});

console.log(`WebSocket server running on port ${PORT}`);

// Broadcast state every second for duration updates
setInterval(broadcastState, 1000);
