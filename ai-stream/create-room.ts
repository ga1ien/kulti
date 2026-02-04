/**
 * Create an HMS room for AI streaming
 * Generates management token and creates room via 100ms API
 */

import * as jwt from 'jsonwebtoken';

const HMS_APP_ACCESS_KEY = '691299afbd0dab5f9a0146b4';
const HMS_APP_SECRET = 'WlzWwpY_kpagvhu47ylYRSz-AV7l6WDE3CiEjtJcBLPXAHMKPs9qm7FN3pAdyvWWPt1N6aRe_-r8SQq1p93htODeQgCpjkop7j-CwRFLnR2hkW8799ZhN3NQVN90mHz1xFPqq426iKeU4gzLIJb8E9edaN0zVIztGfkE1ztw3uw=';

function generateManagementToken(): string {
  const now = Math.floor(Date.now() / 1000);
  
  const payload = {
    access_key: HMS_APP_ACCESS_KEY,
    type: 'management',
    version: 2,
    iat: now,
    nbf: now,
    exp: now + 86400, // 24 hours
    jti: `mgmt-${Date.now()}`
  };

  return jwt.sign(payload, HMS_APP_SECRET, { algorithm: 'HS256' });
}

async function createRoom(name: string, description: string) {
  const token = generateManagementToken();
  
  console.log('Creating room:', name);
  
  const response = await fetch('https://api.100ms.live/v2/rooms', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      name,
      description,
      template_id: '6552a2dc76e6da68b78a4ee0' // Default template - may need to update
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create room: ${response.status} ${error}`);
  }

  return response.json();
}

async function createStreamKey(roomId: string) {
  const token = generateManagementToken();
  
  console.log('Creating stream key for room:', roomId);
  
  const response = await fetch(`https://api.100ms.live/v2/stream-key/room/${roomId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create stream key: ${response.status} ${error}`);
  }

  return response.json();
}

async function main() {
  try {
    // Create room
    const room = await createRoom(
      `nex-stream-${Date.now()}`,
      'Nex AI streaming workspace - Building in public'
    );
    console.log('\n✅ Room created:');
    console.log('  ID:', room.id);
    console.log('  Name:', room.name);

    // Create stream key
    const streamKey = await createStreamKey(room.id);
    console.log('\n✅ Stream key created:');
    console.log('  RTMP URL:', streamKey.rtmp_ingest_url || 'rtmp://ingest.100ms.live/live');
    console.log('  Stream Key:', streamKey.key);

    console.log('\n📺 To start streaming:');
    console.log(`  npx ts-node stream-capture.ts "${streamKey.rtmp_ingest_url || 'rtmp://ingest.100ms.live/live'}" "${streamKey.key}"`);
    
    // Save config for later use
    const config = {
      roomId: room.id,
      roomName: room.name,
      rtmpUrl: streamKey.rtmp_ingest_url || 'rtmp://ingest.100ms.live/live',
      streamKey: streamKey.key,
      createdAt: new Date().toISOString()
    };
    
    const fs = await import('fs');
    fs.writeFileSync('stream-config.json', JSON.stringify(config, null, 2));
    console.log('\n💾 Config saved to stream-config.json');

    return config;
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
