import { beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

// Load the real route, middleware, controller and service, but never load
// Mongoose, Express, userController (SMTP dependencies), or application startup.
// All persistence and JWT verification results below are test doubles.
const owner = "111111111111111111111111";
const stranger = "222222222222222222222222";
const clothingId = "aaaaaaaaaaaaaaaaaaaaaaaa";
const missingId = "bbbbbbbbbbbbbbbbbbbbbbbb";
let records, calls, modelError;
const registeredRoutes = new Map();
const model = {
  async findOneAndDelete(filter) {
    calls.push({ operation: "delete", filter });
    if (modelError) throw modelError;
    const record = records.get(filter._id);
    if (!record || record.userId !== filter.userId) return null;
    records.delete(filter._id);
    return structuredClone(record);
  },
  async findOneAndUpdate(filter, update, options) {
    calls.push({ operation: "update", filter, update, options });
    if (modelError) throw modelError;
    const record = records.get(filter._id);
    if (!record || record.userId !== filter.userId) return null;
    Object.assign(record, structuredClone(update.$set));
    return structuredClone(record);
  },
};
const jwt = {
  verify(token, secret, callback) {
    assert.equal(secret, "test-only-secret");
    if (token === "owner") return callback(null, { id: owner });
    if (token === "stranger") return callback(null, { id: stranger });
    if (token === "missing-subject") return callback(null, {});
    if (token === "invalid-subject") return callback(null, { id: { $ne: null } });
    callback(Object.assign(new Error("Invalid test token"), {
      name: token === "expired" ? "TokenExpiredError" : "JsonWebTokenError",
    }));
  },
};
const express = {
  Router() {
    return Object.fromEntries(["get", "post", "put", "delete"].map((method) => [
      method,
      (path, ...handlers) => registeredRoutes.set(method + " " + path, handlers),
    ]));
  },
};
const mocks = { clothing: model, interest: {}, jwt, express, user: { JWTSecret: "test-only-secret" } };
const mockKey = Symbol.for("reveste.clothing-ownership.tests");
globalThis[mockKey] = mocks;
const mockFiles = new Map([
  [new URL("../models/Clothing.js", import.meta.url).href, "clothing"],
  [new URL("../models/Interest.js", import.meta.url).href, "interest"],
  [new URL("../controllers/userController.js", import.meta.url).href, "user"],
]);
const realFiles = new Set([
  "../routes/clothingRoutes.js", "../middleware/Auth.js",
  "../controllers/clothingController.js", "../services/clothingService.js",
].map((file) => new URL(file, import.meta.url).href));
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "jsonwebtoken" || specifier === "express") {
      return { url: "clothing-test:" + (specifier === "express" ? "express" : "jwt"), shortCircuit: true };
    }
    const url = new URL(specifier, context.parentURL).href;
    if (mockFiles.has(url)) return { url: "clothing-test:" + mockFiles.get(url), shortCircuit: true };
    if (realFiles.has(url)) return nextResolve(specifier, context);
    throw new Error("Unexpected import blocked by isolated test: " + specifier);
  },
  load(url, context, nextLoad) {
    if (url.startsWith("clothing-test:")) {
      const name = url.slice("clothing-test:".length);
      return {
        format: "module",
        source: 'export default globalThis[Symbol.for("reveste.clothing-ownership.tests")][' + JSON.stringify(name) + '];',
        shortCircuit: true,
      };
    }
    return nextLoad(url, context);
  },
});
await import("../routes/clothingRoutes.js");
const { default: service } = await import("../services/clothingService.js");
hooks.deregister();
delete globalThis[mockKey];

beforeEach((t) => {
  records = new Map([[clothingId, {
    _id: clothingId, userId: owner, title: "Original", description: "Descricao",
    media: [{ type: "image", url: "https://example.invalid/ficticia.png" }],
  }]]);
  calls = [];
  modelError = null;
  t.mock.method(console, "log", () => {});
});

async function request(method, { token = "owner", id = clothingId, body = { title: "Atualizada" } } = {}) {
  const handlers = registeredRoutes.get(method + " /clothes/:id");
  assert.equal(handlers.length, 2, "Authentication must remain on the route");
  const req = { params: { id }, body, headers: token === null ? {} : { authorization: "Bearer " + token } };
  const res = {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(data) { this.body = data; return this; },
  };
  let controllerRun;
  handlers[0](req, res, () => { controllerRun = handlers[1](req, res); });
  if (controllerRun) await controllerRun;
  return res;
}

for (const method of ["put", "delete"]) {
  for (const token of [null, "invalid", "expired", "missing-subject", "invalid-subject"]) {
    test(method + ": unauthenticated/invalid identity " + token + " returns 401 without model access", async () => {
      const res = await request(method, { token });
      assert.equal(res.statusCode, 401);
      assert.equal(calls.length, 0);
      assert.equal(records.size, 1);
    });
  }
  for (const id of ["invalid", "", "a".repeat(23), "z".repeat(24), { $ne: null }]) {
    test(method + ": invalid ID " + JSON.stringify(id) + " returns 400 without model access", async () => {
      const res = await request(method, { id });
      assert.equal(res.statusCode, 400);
      assert.equal(calls.length, 0);
    });
  }
  test(method + ": another user gets 404 and record is unchanged", async () => {
    const before = structuredClone(records.get(clothingId));
    const res = await request(method, { token: "stranger" });
    assert.equal(res.statusCode, 404);
    assert.deepEqual(res.body, { error: "Peça não encontrada" });
    assert.deepEqual(records.get(clothingId), before);
    assert.deepEqual(calls[0].filter, { _id: clothingId, userId: stranger });
    assert.equal(calls.length, 1, "Only one atomic model operation");
  });
  test(method + ": missing item gets identical 404", async () => {
    const res = await request(method, { id: missingId });
    assert.equal(res.statusCode, 404);
    assert.deepEqual(res.body, { error: "Peça não encontrada" });
    assert.equal(records.size, 1);
  });
  test(method + ": unexpected model failure preserves 500 response contract", async () => {
    modelError = new Error("Simulated database failure");
    const res = await request(method);
    assert.equal(res.statusCode, 500);
    assert.deepEqual(res.body, { error: method === "put" ? "Erro ao atualizar peça" : "Não foi possível remover a peça" });
    assert.equal(records.size, 1);
  });
}

test("DELETE: owner succeeds using one atomic ownership filter", async () => {
  const res = await request("delete");
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { message: "Peça removida com sucesso" });
  assert.equal(records.has(clothingId), false);
  assert.deepEqual(calls, [{ operation: "delete", filter: { _id: clothingId, userId: owner } }]);
});

test("PUT: owner edits permitted fields; extra frontend fields and ownership changes are ignored", async () => {
  const body = {
    title: "Nova", description: "Nova descricao", media: [],
    userId: stranger, _id: missingId, size: "", category: "", condition: "",
    createdAt: "2030-01-01", arbitrary: "ignored",
  };
  const res = await request("put", { body });
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.message, "Peça atualizada com sucesso");
  assert.equal(res.body.clothing._id, clothingId);
  assert.equal(res.body.clothing.userId, owner);
  assert.deepEqual(calls, [{
    operation: "update", filter: { _id: clothingId, userId: owner },
    update: { $set: { title: "Nova", description: "Nova descricao", media: [] } },
    options: { new: true, runValidators: true },
  }]);
  assert.deepEqual(body.userId, stranger, "Request body not mutated");
});

for (const field of ["title", "description", "media"]) {
  test("PUT: partial update of " + field + " preserves other fields", async () => {
    const value = field === "media" ? [] : "Valor";
    const before = structuredClone(records.get(clothingId));
    const res = await request("put", { body: { [field]: value } });
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body.clothing, { ...before, [field]: value });
  });
}

for (const body of [
  { $set: { userId: stranger } }, { $unset: { title: 1 } }, { $rename: { title: "userId" } },
  { title: { $ne: null } }, { media: [{ $set: { url: "injected" } }] },
  { "media.0.url": "injected" }, { title: "Valid", userId: { $ne: null } },
  [{ $set: { title: "pipeline" } }], [], null, "invalid", {},
  { userId: stranger, _id: missingId }, { size: "4" },
]) {
  test("PUT: unsafe/empty body rejected before model access " + JSON.stringify(body), async () => {
    const before = structuredClone(records.get(clothingId));
    const res = await request("put", { body });
    assert.equal(res.statusCode, 400);
    assert.equal(calls.length, 0);
    assert.deepEqual(records.get(clothingId), before);
  });
}

for (const name of ["ValidationError", "CastError"]) {
  test("PUT: " + name + " becomes 400 without leaking internal details", async () => {
    modelError = Object.assign(new Error("Sensitive internal diagnostic"), { name });
    const res = await request("put");
    assert.equal(res.statusCode, 400);
    assert.deepEqual(res.body, { error: "Dados da peça inválidos" });
    assert.equal(records.get(clothingId).title, "Original");
  });
}

test("Service cannot delete or update without an authenticated owner ID", async () => {
  await assert.rejects(service.delete(clothingId), { statusCode: 401 });
  await assert.rejects(service.update(clothingId, undefined, { title: "Changed" }), { statusCode: 401 });
  assert.equal(calls.length, 0);
});
