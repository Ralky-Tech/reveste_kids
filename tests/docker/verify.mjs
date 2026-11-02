import assert from 'node:assert/strict';

const base = process.argv[2] || 'http://frontend:8080';
const origin = process.env.CORS_ORIGINS.split(',')[0];
const home = await fetch(base);
assert.equal(home.status, 200);
assert.match(await home.text(), /<div id="root"><\/div>/);
assert.equal((await fetch(`${base}/feed`)).status, 200, 'SPA deep links');
assert.equal((await fetch(`${base}/healthz`)).status, 200);

const health = await fetch(`${base}/backend/health`, { headers: { Origin: origin } });
assert.equal(health.status, 200);
assert.equal(health.headers.get('access-control-allow-origin'), origin);
assert.equal((await health.json()).simulated, true);
const login = await fetch(`${base}/backend/auth`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ marker: 'compose-smoke' }),
});
assert.deepEqual(await login.json(), { simulated: true, received: 'compose-smoke' });
assert.equal((await (await fetch(`${base}/backend/api/clothes-check`)).json()).apiPrefixPreserved, true);

const socketUrl = new URL('/socket.io/?EIO=4&transport=websocket', base);
socketUrl.protocol = socketUrl.protocol === 'https:' ? 'wss:' : 'ws:';
await new Promise((resolve, reject) => {
  const socket = new WebSocket(socketUrl);
  const timeout = setTimeout(() => { socket.close(); reject(new Error('Socket.IO proxy timed out')); }, 10000);
  const finish = error => { clearTimeout(timeout); socket.close(); error ? reject(error) : resolve(); };
  socket.addEventListener('error', () => finish(new Error('WebSocket proxy failed')), { once: true });
  socket.addEventListener('message', ({ data }) => {
    try {
      if (data.startsWith('0')) socket.send('40');
      else if (data.startsWith('40')) socket.send('42["join-match-room",{"matchId":"ci-room"}]');
      else if (data === '2') socket.send('3');
      else if (data.startsWith('42')) {
        assert.deepEqual(JSON.parse(data.slice(2)), ['smoke:joined', { joined: true }]);
        finish();
      }
    } catch (error) { finish(error); }
  });
});
console.log('Docker smoke passed: SPA, HTTP proxy, CORS, /api paths and Socket.IO WebSocket. No database access.');
