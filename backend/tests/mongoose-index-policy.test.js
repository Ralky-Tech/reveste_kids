import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

// Each environment gets a fresh module graph and a real Mongoose instance.
// dotenv and index writes are intercepted; no database connection is opened.
const offlineProbe = `
  import assert from 'node:assert/strict';
  import { registerHooks } from 'node:module';
  import { readdirSync } from 'node:fs';
  import mongoose from 'mongoose';
  const defaults = mongoose.get('autoIndex');
  const hooks = registerHooks({
    resolve(specifier, context, nextResolve) {
      if (specifier === 'dotenv') return { url: 'policy-test:dotenv', shortCircuit: true };
      return nextResolve(specifier, context);
    },
    load(url, context, nextLoad) {
      if (url === 'policy-test:dotenv') return {
        format: 'module', shortCircuit: true,
        source: 'export default { config() { if (process.env.POLICY_TEST_DOTENV) process.env.NODE_ENV = "production"; } };',
      };
      return nextLoad(url, context);
    },
  });
  try { await import('./config/mongoose.js'); } finally { hooks.deregister(); }
  const production = process.env.NODE_ENV === 'production';
  assert.equal(mongoose.get('autoIndex'), production ? false : defaults);
  let compiled = 0, indexAttempts = 0;
  const model = mongoose.model.bind(mongoose);
  mongoose.model = function(name, schema, ...args) {
    if (schema) {
      compiled++;
      assert.equal(mongoose.get('autoIndex'), production ? false : defaults);
      assert.equal(schema.options.autoIndex, null);
    }
    return model(name, schema, ...args);
  };
  // Bypass collection creation in the offline harness only. The application
  // retains its existing autoCreate behavior.
  mongoose.connection.config.autoCreate = false;
  mongoose.Model.ensureIndexes = async function() { indexAttempts++; };
  mongoose.connect = () => { throw new Error('Unexpected database connection'); };
  const files = readdirSync('./models').filter(name => name.endsWith('.js'));
  for (const file of files) await import('./models/' + file);
  for (const value of Object.values(mongoose.models)) await value.init();
  assert.equal(compiled, files.length);
  assert.equal(indexAttempts, production ? 0 : files.length);
  assert.equal(mongoose.connection.readyState, 0);
  console.log(JSON.stringify({ compiled, indexAttempts, production }));
`;

test('entry point evaluates the index policy before any application import', () => {
  const entry = readFileSync(new URL('../index.js', import.meta.url), 'utf8');
  assert.match(entry, /^import mongoose from "\.\/config\/mongoose\.js";/);
});

for (const environment of ['production', 'development', 'test', '']) {
  test('real model initialization respects index policy: ' + (environment || 'unset'), () => {
    const result = JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', offlineProbe], {
      cwd: new URL('../', import.meta.url), encoding: 'utf8', timeout: 15000,
      env: { ...process.env, NODE_ENV: environment, POLICY_TEST_DOTENV: '' },
    }));
    assert.equal(result.production, environment === 'production');
    assert.ok(result.compiled > 0);
    assert.equal(result.indexAttempts, environment === 'production' ? 0 : result.compiled);
  });
}

test('production environment loaded by dotenv is applied before model compilation', () => {
  const result = JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', offlineProbe], {
    cwd: new URL('../', import.meta.url), encoding: 'utf8', timeout: 15000,
    env: { ...process.env, NODE_ENV: 'development', POLICY_TEST_DOTENV: '1' },
  }));
  assert.equal(result.production, true);
  assert.equal(result.indexAttempts, 0);
});
