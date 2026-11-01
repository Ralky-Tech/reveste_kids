import { beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

// Exercise the real public routes, controller and service without loading
// application startup, dotenv files, MongoDB or any external dependency.
const routes = new Map();
let records;
class User {
  constructor(fields) { Object.assign(this, fields); this._id = "test-user-id"; }
  async save() { records.push(this); }
  static async findOne({ email }) { return records.find(user => user.email === email); }
}
const mocks = {
  User,
  express: { Router: () => ({ post: (path, handler) => routes.set(path, handler) }) },
  dotenv: { config() {} },
  bcrypt: {
    genSaltSync: () => "test-salt",
    hashSync: password => "test-hash:" + password,
    compareSync: (password, hash) => hash === "test-hash:" + password,
  },
  jwt: {
    sign(payload, secret, options, callback) {
      assert.equal(secret, undefined); // No environment configuration is required.
      assert.equal(options.expiresIn, "48h");
      callback(null, JSON.stringify(payload));
    },
  },
};
const key = Symbol.for("reveste.public-registration-role.tests");
globalThis[key] = mocks;
const realFiles = new Set([
  "../routes/userRoutes.js", "../controllers/userController.js", "../services/userService.js",
].map(file => new URL(file, import.meta.url).href));
const modelUrl = new URL("../models/Users.js", import.meta.url).href;
const googleUrl = new URL("../controllers/googleAuthController.js", import.meta.url).href;
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (["express", "dotenv", "bcrypt", "jsonwebtoken"].includes(specifier)) {
      return { url: "registration-test:" + (specifier === "jsonwebtoken" ? "jwt" : specifier), shortCircuit: true };
    }
    const url = new URL(specifier, context.parentURL).href;
    if (url === googleUrl) return { url: "registration-test:google", shortCircuit: true };
    if (url === modelUrl) return { url: "registration-test:User", shortCircuit: true };
    if (realFiles.has(url)) return nextResolve(specifier, context);
    throw new Error("Unexpected import blocked: " + specifier);
  },
  load(url, context, nextLoad) {
    if (url.startsWith("registration-test:")) {
      if (url === "registration-test:google") {
        return { format: "module", shortCircuit: true,
          source: 'export function googleLogin() { throw new Error("Google login is outside registration tests"); }' };
      }
      return {
        format: "module", shortCircuit: true,
        source: 'export default globalThis[Symbol.for("reveste.public-registration-role.tests")][' + JSON.stringify(url.slice("registration-test:".length)) + '];',
      };
    }
    // Give the controller an isolated environment without reading or changing .env.
    if (url.endsWith("/controllers/userController.js")) {
      const loaded = nextLoad(url, context);
      return { ...loaded, source: 'const process = { env: {} };\n' + loaded.source.toString() };
    }
    return nextLoad(url, context);
  },
});
try { await import("../routes/userRoutes.js"); }
finally { hooks.deregister(); delete globalThis[key]; }

beforeEach(() => { records = []; });
async function request(path, body) {
  const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(data) { this.body = data; return this; } };
  await routes.get(path)({ body }, res);
  return res;
}
const registration = { name: "Test User", email: "test@example.invalid", password: "test-password" };

for (const [name, extra] of [
  ["normal registration", {}],
  ["client requests admin", { role: "admin" }],
  ["extra privilege fields", { role: { $ne: "user" }, isAdmin: true, permissions: ["admin"], user: { role: "admin" }, $set: { role: "admin" } }],
]) {
  test(name + " always persists user role", async () => {
    const res = await request("/user", { ...registration, ...extra });
    assert.equal(res.statusCode, 201);
    assert.equal(records.length, 1);
    assert.equal(records[0].role, "user");
    assert.equal(records[0].password, "test-hash:test-password");
    assert.deepEqual(Object.keys(records[0]).sort(), ["_id", "email", "name", "password", "role"]);
  });
}

test("traditional login uses the persisted user role after attempted escalation", async () => {
  await request("/user", { ...registration, role: "admin" });
  const res = await request("/auth", registration);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(JSON.parse(res.body.token), { id: "test-user-id", email: registration.email, role: "user" });
});

test("traditional login still rejects incorrect passwords", async () => {
  await request("/user", registration);
  const res = await request("/auth", { ...registration, password: "incorrect" });
  assert.equal(res.statusCode, 401);
  assert.equal(res.body.token, undefined);
});

test("existing administrator login retains its stored role", async () => {
  records.push(new User({ ...registration, password: "test-hash:test-password", role: "admin" }));
  const res = await request("/auth", registration);
  assert.equal(res.statusCode, 200);
  assert.equal(JSON.parse(res.body.token).role, "admin");
});
