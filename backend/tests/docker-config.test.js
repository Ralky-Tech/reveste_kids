import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';

const subprocessTimeout = process.platform === 'win32' ? 45000 : 15000;

test('CORS keeps published origins and accepts explicitly configured Compose origins', () => {
  execFileSync(process.execPath, ['--input-type=module', '-e', `
    import assert from 'node:assert/strict';
    import { allowedOrigins } from './config/cors.js';
    assert.ok(allowedOrigins.includes('http://localhost:5173'));
    assert.ok(allowedOrigins.includes('https://reveste-kids-sepia.vercel.app'));
    assert.ok(allowedOrigins.includes('http://localhost:8080'));
    assert.ok(allowedOrigins.includes('http://localhost:18080'));
    assert.ok(!allowedOrigins.includes('*'));
  `], {
    cwd: new URL('../', import.meta.url), timeout: subprocessTimeout,
    env: { ...process.env, CORS_ORIGINS: 'http://localhost:8080, http://localhost:18080, ' },
  });
});

const probe = `
  import mongoose from 'mongoose';
  import { registerHooks } from 'node:module';
  globalThis.dockerProbeMongoose = mongoose;
  globalThis.dockerProbeDnsCalls = 0;
  registerHooks({
    resolve(specifier, context, nextResolve) {
      if (specifier === 'node:dns') return { url: 'docker-test:dns', shortCircuit: true };
      if (specifier === './index.js' && context.parentURL.endsWith('/docker-entrypoint.js')) {
        return { url: 'docker-test:app', shortCircuit: true };
      }
      return nextResolve(specifier, context);
    },
    load(url, context, nextLoad) {
      if (url === 'docker-test:dns') return { format: 'module', shortCircuit: true,
        source: 'export default { setServers(servers) { if (servers[0] !== "192.0.2.53") throw Error("Unexpected DNS"); globalThis.dockerProbeDnsCalls++; } };' };
      if (url === 'docker-test:app') return { format: 'module', shortCircuit: true,
        source: 'if (globalThis.dockerProbeMongoose.get("autoIndex") !== false || globalThis.dockerProbeMongoose.get("autoCreate") !== false || globalThis.dockerProbeMongoose.modelNames().length !== 0) throw Error("Policy must precede models"); globalThis.dockerProbeAppLoaded = true;' };
      return nextLoad(url, context);
    },
  });
  await import('./docker-entrypoint.js');
  if (!globalThis.dockerProbeAppLoaded) throw Error('Missing app import');
  if (globalThis.dockerProbeDnsCalls !== (process.env.DOCKER_DNS_SERVER ? 1 : 0)) throw Error('DNS policy mismatch');
  if (mongoose.connection.readyState !== 0) throw Error('Unexpected connection');
`;
for (const dns of ['', '192.0.2.53']) {
  test('Docker bootstrap disables index/collection creation before models; DNS ' + (dns ? 'defined' : 'absent'), () => {
    execFileSync(process.execPath, ['--input-type=module', '-e', probe], {
      cwd: new URL('../', import.meta.url), timeout: subprocessTimeout,
      env: { ...process.env, NODE_ENV: 'production', DOCKER_DNS_SERVER: dns },
    });
  });
}
test('Docker bootstrap rejects invalid DNS without importing the app', () => {
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', probe], {
    cwd: new URL('../', import.meta.url), timeout: subprocessTimeout, encoding: 'utf8',
    env: { ...process.env, NODE_ENV: 'production', DOCKER_DNS_SERVER: 'not-an-ip' },
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Invalid container DNS server/);
});
