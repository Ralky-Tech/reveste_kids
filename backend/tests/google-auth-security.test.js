import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { generateKeyPairSync } from 'node:crypto';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';

// Real cryptography, JWT, bcrypt and Google verification; only certificate
// retrieval and persistence are simulated. No Google/MongoDB connection.
const signingKey = generateKeyPairSync('rsa', { modulusLength: 2048 });
const otherKey = generateKeyPairSync('rsa', { modulusLength: 2048 });
const publicKey = signingKey.publicKey.export({ type: 'spki', format: 'pem' });
const audience = 'review-client.apps.googleusercontent.com';
const env = { GOOGLE_CLIENT_ID: audience, JWTSECRET: 'isolated-test-secret' };
let records, indexes, verificationCalls, persistenceCalls, saveError, initCalls, indexReadError;
const requiredIndexes = [
  { key: { googleSub: 1 }, unique: true, partialFilterExpression: { googleSub: { $type: 'string' } } },
  { key: { email: 1 }, unique: true, collation: { locale: 'en', strength: 2 } },
];
class OfflineOAuthClient extends OAuth2Client {
  async getFederatedSignonCertsAsync() {
    verificationCalls++;
    return { certs: { 'offline-key': publicKey }, format: 'PEM' };
  }
}
class User {
  constructor(fields) { Object.assign(this, fields); this._id ||= 'new-user'; }
  async save() {
    persistenceCalls++;
    if (saveError) throw saveError;
    if (records.some(user => user.googleSub === this.googleSub || user.email.toLowerCase() === this.email.toLowerCase())) {
      throw Object.assign(new Error('duplicate'), { code: 11000 });
    }
    records.push(this);
  }
  static async init() { initCalls++; persistenceCalls++; }
  static collection = { listIndexes: () => ({ toArray: async () => {
    if (indexReadError) throw indexReadError;
    return indexes;
  } }) };
  static find({ googleSub }) {
    persistenceCalls++;
    return { limit: async limit => records.filter(user => user.googleSub === googleSub).slice(0, limit) };
  }
  static findOne({ email }) {
    persistenceCalls++;
    return { collation(options) {
      assert.deepEqual(options, { locale: 'en', strength: 2 });
      return Promise.resolve(records.find(user => user.email.toLowerCase() === email.toLowerCase()));
    } };
  }
}
const key = Symbol.for('reveste.google-security.tests');
globalThis[key] = { User, OfflineOAuthClient, env };
const modelUrl = new URL('../models/Users.js', import.meta.url).href;
const controllerUrl = new URL('../controllers/googleAuthController.js', import.meta.url).href;
const serviceUrl = new URL('../services/userService.js', import.meta.url).href;
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === 'google-auth-library') return { url: 'google-test:library', shortCircuit: true };
    if (['jsonwebtoken', 'bcrypt', 'node:crypto'].includes(specifier)) return nextResolve(specifier, context);
    const url = new URL(specifier, context.parentURL).href;
    if (url === modelUrl) return { url: 'google-test:model', shortCircuit: true };
    if ([controllerUrl, serviceUrl].includes(url)) return nextResolve(specifier, context);
    throw new Error('Unexpected import blocked: ' + specifier);
  },
  load(url, context, nextLoad) {
    const access = 'globalThis[Symbol.for("reveste.google-security.tests")]';
    if (url === 'google-test:library') return { format: 'module', shortCircuit: true, source: `export const OAuth2Client = ${access}.OfflineOAuthClient;` };
    if (url === 'google-test:model') return { format: 'module', shortCircuit: true, source: `export default ${access}.User;` };
    const loaded = nextLoad(url, context);
    if ([controllerUrl, serviceUrl].includes(url)) return { ...loaded, source: `const process = { env: ${access}.env };\n` + loaded.source.toString() };
    return loaded;
  },
});
let googleLogin;
try { ({ googleLogin } = await import('../controllers/googleAuthController.js')); }
finally { hooks.deregister(); delete globalThis[key]; }
// Load the real schema separately without connecting to a database.
const { default: RealUser } = await import('../models/Users.js');

beforeEach(() => {
  records = []; indexes = structuredClone(requiredIndexes);
  verificationCalls = 0; persistenceCalls = 0; saveError = undefined;
  initCalls = 0; indexReadError = undefined;
  env.NODE_ENV = 'test';
  env.GOOGLE_CLIENT_ID = audience; env.JWTSECRET = 'isolated-test-secret';
});
function token(claims = {}, privateKey = signingKey.privateKey) {
  const now = Math.floor(Date.now() / 1000);
  return jwt.sign({ iss: 'https://accounts.google.com', aud: audience, sub: 'google-user',
    email: 'person@example.invalid', email_verified: true, iat: now, exp: now + 3600, ...claims },
  privateKey, { algorithm: 'RS256', keyid: 'offline-key' });
}
async function request(body = { idToken: token() }, extra = {}) {
  const res = { code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
  await googleLogin({ body, ...extra }, res);
  return res;
}
function noSession(res, status) { assert.equal(res.code, status); assert.equal(res.body.token, undefined); }

test('valid signed ID token creates only user role and issues compatible JWT', async () => {
  const res = await request({ idToken: token(), role: 'admin', googleSub: 'attacker' });
  assert.equal(res.code, 200); assert.equal(records.length, 1);
  assert.equal(records[0].googleSub, 'google-user'); assert.equal(records[0].role, 'user');
  assert.ok(await bcrypt.compare('not-the-random-password', records[0].password) === false);
  const payload = jwt.verify(res.body.token, env.JWTSECRET);
  assert.equal(payload.id, 'new-user'); assert.equal(payload.role, 'user');
  assert.equal(payload.email, records[0].email); assert.equal(payload.exp - payload.iat, 172800);
});
for (const [name, claims, wrongKey] of [
  ['invalid signature', {}, true],
  ['expired token', { iat: 1, exp: 2 }],
  ['incorrect audience', { aud: 'another-app' }],
  ['incorrect issuer', { iss: 'https://attacker.invalid' }],
  ['future issued token', { iat: Math.floor(Date.now() / 1000) + 1800 }],
]) {
  test(name + ' is rejected by real Google verifier', async () => {
    const res = await request({ idToken: token(claims, wrongKey ? otherKey.privateKey : signingKey.privateKey) });
    noSession(res, 401); assert.equal(persistenceCalls, 0); assert.equal(records.length, 0);
  });
}
for (const [name, claims] of [
  ['missing sub', { sub: '' }], ['non-string sub', { sub: 42 }],
  ['unverified email', { email_verified: false }], ['string verified flag', { email_verified: 'true' }],
  ['missing email', { email: '' }],
]) {
  test(name + ' cannot create a session', async () => {
    noSession(await request({ idToken: token(claims) }), 401); assert.equal(persistenceCalls, 0);
  });
}
test('missing Google client ID rejects without verifying tokens or accessing persistence', async () => {
  delete env.GOOGLE_CLIENT_ID;
  noSession(await request(), 503); assert.equal(verificationCalls, 0); assert.equal(persistenceCalls, 0);
});
test('missing application JWT secret fails closed', async () => {
  delete env.JWTSECRET; noSession(await request(), 503); assert.equal(verificationCalls, 0);
});
test('access token contract and malformed tokens are rejected', async () => {
  noSession(await request({ accessToken: 'legacy-access-token' }), 400);
  noSession(await request({ idToken: {} }), 400);
  noSession(await request({ idToken: 'x'.repeat(16385) }), 400);
  noSession(await request({ idToken: 'not-a-jwt' }), 401);
});
test('existing sub is found before email; stored role and email are used', async () => {
  records.push({ _id: 'existing', googleSub: 'google-user', email: 'old@example.invalid', role: 'user' });
  const res = await request(); assert.equal(res.code, 200); assert.equal(records.length, 1);
  const payload = jwt.verify(res.body.token, env.JWTSECRET); assert.equal(payload.id, 'existing');
  assert.equal(payload.email, 'old@example.invalid');
});
test('duplicate stored sub fails closed', async () => {
  records.push({ googleSub: 'google-user' }, { googleSub: 'google-user' });
  noSession(await request(), 409); assert.equal(records.length, 2);
});
test('already linked administrator uses the stored identity and role', async () => {
  records.push({ _id: 'admin', email: 'admin@example.invalid', role: 'admin', googleSub: 'google-user' });
  const res = await request(); assert.equal(res.code, 200);
  assert.equal(jwt.verify(res.body.token, env.JWTSECRET).role, 'admin');
  assert.equal(records.length, 1);
});
for (const role of ['user', 'admin']) {
  test('existing ' + role + ' email never auto-links or authenticates', async () => {
    records.push({ _id: 'existing', email: 'PERSON@example.invalid', role });
    const res = await request(); noSession(res, 409);
    assert.equal(res.body.code, 'GOOGLE_LINK_REQUIRED');
    assert.equal(records.length, 1); assert.equal(records[0].googleSub, undefined);
  });
}
test('identity already attached to another sub is never replaced by email match', async () => {
  records.push({ email: 'person@example.invalid', role: 'user', googleSub: 'other-sub' });
  noSession(await request(), 409); assert.equal(records[0].googleSub, 'other-sub');
});
test('even authenticated users must wait for explicit linking flow', async () => {
  records.push({ _id: 'existing', email: 'person@example.invalid', role: 'user' });
  const authorization = 'Bearer ' + jwt.sign({ id: 'existing', role: 'user' }, env.JWTSECRET);
  noSession(await request({ idToken: token(), password: 'confirmation', link: true },
    { headers: { authorization }, loggerUser: { id: 'existing' } }), 409);
  assert.equal(records[0].googleSub, undefined);
});
test('forged account IDs cannot link or elevate privileges', async () => {
  records.push({ _id: 'victim', email: 'person@example.invalid', role: 'admin' });
  noSession(await request({ idToken: token(), userId: 'victim', role: 'admin', link: true }), 409);
  assert.equal(records[0].googleSub, undefined);
});
test('concurrent unique-key conflict does not produce a session', async () => {
  saveError = Object.assign(new Error('sensitive db error'), { code: 11000 });
  noSession(await request(), 409); assert.equal(records.length, 0);
});
test('missing indexes and storage errors fail closed without leaking internals', async () => {
  indexes = []; noSession(await request(), 503); assert.equal(records.length, 0);
  indexes = structuredClone(requiredIndexes); saveError = new Error('sensitive database details');
  const res = await request(); noSession(res, 503);
  assert.ok(!JSON.stringify(res.body).includes('sensitive'));
});
test('partial or case-sensitive substitutes cannot bypass index requirements', async () => {
  indexes[0].partialFilterExpression.role = 'user';
  noSession(await request(), 503);
  indexes = structuredClone(requiredIndexes);
  indexes[1].collation.caseLevel = true;
  noSession(await request(), 503);
  assert.equal(records.length, 0);
});
test('schema supports legacy users and declares partial unique Google identity', () => {
  const legacy = new RealUser({ name: 'Legacy', email: 'legacy@example.invalid', password: 'hash' });
  assert.equal(legacy.googleSub, undefined); assert.equal(legacy.role, 'user');
  assert.equal(legacy.validateSync(), undefined);
  const googleIndex = RealUser.schema.indexes().find(([fields]) => fields.googleSub === 1);
  assert.equal(googleIndex[1].unique, true);
  assert.deepEqual(googleIndex[1].partialFilterExpression, { googleSub: { $type: 'string' } });
  assert.ok(RealUser.schema.indexes().some(([fields, options]) => fields.email === 1 && options.unique && options.collation?.strength === 2));
  assert.equal(mongoose.connection.readyState, 0);
});

test('production with valid indexes allows Google login without calling User.init', async () => {
  env.NODE_ENV = 'production';
  const res = await request();
  assert.equal(res.code, 200); assert.equal(records.length, 1);
  assert.equal(initCalls, 0);
});
for (const missing of [0, 1, 'all']) {
  test('production missing index ' + missing + ' blocks Google without initialization or writes', async () => {
    env.NODE_ENV = 'production';
    indexes = missing === 'all' ? [] : indexes.filter((_, position) => position !== missing);
    noSession(await request(), 503);
    assert.equal(initCalls, 0); assert.equal(persistenceCalls, 0);
    assert.equal(records.length, 0);
  });
}
test('production index inspection failure blocks Google without initializing models', async () => {
  env.NODE_ENV = 'production'; indexReadError = new Error('not authorized to list indexes');
  noSession(await request(), 503);
  assert.equal(initCalls, 0); assert.equal(persistenceCalls, 0);
});
for (const environment of ['development', 'test', undefined]) {
  test('model initialization remains enabled outside production: ' + environment, async () => {
    env.NODE_ENV = environment;
    assert.equal((await request()).code, 200);
    assert.equal(initCalls, 1);
  });
}
