import { beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

// No application startup or external dependencies are loaded. The real model's
// schema declaration is captured; persistence, Express and JWT are simulated.
const owner = "111111111111111111111111";
const stranger = "222222222222222222222222";
const id = "aaaaaaaaaaaaaaaaaaaaaaaa";
const fields = ["category", "size", "condition", "style"];
const emptyAttributes = Object.fromEntries(fields.map((field) => [field, ""]));
const attributes = { category: "Calça", size: "RN", condition: "Seminova", style: "Casual" };
const legacy = {
  _id: id, userId: owner, title: "Peça fictícia", description: "Descrição antiga",
  media: [{ type: "image", url: "https://example.invalid/ficticia.png" }],
};
let records, calls, modelError, schema;
const routes = new Map();
class FakeClothing {
  constructor(data) {
    this.data = { ...structuredClone(data), _id: id };
    calls.push({ operation: "create", data: structuredClone(data) });
  }
  async save() {
    if (modelError) throw modelError;
    records.set(id, structuredClone(this.data));
  }
  toObject() { return structuredClone(this.data); }
  static find(filter = {}) {
    calls.push({ operation: "find", filter });
    const values = [...records.values()]
      .filter((item) => !filter.userId || item.userId === filter.userId)
      .map((item) => structuredClone(item));
    return {
      populate() {
        const result = Promise.resolve(values);
        result.lean = async () => values;
        return result;
      },
    };
  }
  static findById(itemId) {
    calls.push({ operation: "findById", id: itemId });
    return { populate: async () => structuredClone(records.get(itemId) || null) };
  }
  static async findOneAndUpdate(filter, update, options) {
    calls.push({ operation: "update", filter, update, options });
    if (modelError) throw modelError;
    const item = records.get(filter._id);
    if (!item || item.userId !== filter.userId) return null;
    Object.assign(item, structuredClone(update.$set));
    return structuredClone(item);
  }
  static async findOneAndDelete(filter) {
    calls.push({ operation: "delete", filter });
    const item = records.get(filter._id);
    if (!item || item.userId !== filter.userId) return null;
    records.delete(filter._id);
    return structuredClone(item);
  }
}
class FakeSchema {
  static Types = { ObjectId: class {} };
  constructor(definition) { this.definition = definition; }
}
const mongoose = {
  Schema: FakeSchema,
  model(name, definition) {
    assert.equal(name, "Clothing");
    schema = definition.definition;
    return FakeClothing;
  },
};
const jwt = {
  verify(token, secret, callback) {
    assert.equal(secret, "test-only-secret");
    if (token === "owner") return callback(null, { id: owner });
    if (token === "stranger") return callback(null, { id: stranger });
    callback(new Error("Invalid fake token"));
  },
};
const express = {
  Router: () => Object.fromEntries(["get", "post", "put", "delete"].map((method) => [
    method, (path, ...handlers) => routes.set(method + " " + path, handlers),
  ])),
};
const key = Symbol.for("reveste.clothing-attributes.tests");
globalThis[key] = {
  mongoose, jwt, express, user: { JWTSecret: "test-only-secret" },
  interest: { countDocuments: async () => 3 },
};
const stubFiles = new Map([
  [new URL("../models/Interest.js", import.meta.url).href, "interest"],
  [new URL("../controllers/userController.js", import.meta.url).href, "user"],
]);
const realFiles = new Set([
  "../routes/clothingRoutes.js", "../middleware/Auth.js",
  "../controllers/clothingController.js", "../services/clothingService.js",
  "../models/Clothing.js",
].map((file) => new URL(file, import.meta.url).href));
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    const names = { mongoose: "mongoose", jsonwebtoken: "jwt", express: "express" };
    if (Object.hasOwn(names, specifier)) {
      return { url: "attribute-test:" + names[specifier], shortCircuit: true };
    }
    const url = new URL(specifier, context.parentURL).href;
    if (stubFiles.has(url)) return { url: "attribute-test:" + stubFiles.get(url), shortCircuit: true };
    if (realFiles.has(url)) return nextResolve(specifier, context);
    throw new Error("Unexpected import blocked by isolated test: " + specifier);
  },
  load(url, context, nextLoad) {
    if (!url.startsWith("attribute-test:")) return nextLoad(url, context);
    return {
      format: "module", shortCircuit: true,
      source: 'export default globalThis[Symbol.for("reveste.clothing-attributes.tests")][' +
        JSON.stringify(url.slice("attribute-test:".length)) + '];',
    };
  },
});
await import("../routes/clothingRoutes.js");
hooks.deregister();
delete globalThis[key];
const { default: swagger } = await import("../swagger.js");

beforeEach((t) => {
  records = new Map([[id, structuredClone(legacy)]]);
  calls = [];
  modelError = null;
  t.mock.method(console, "log", () => {});
});

async function request(method, path, { token = "owner", body = {}, itemId = id } = {}) {
  const handlers = routes.get(method + " " + path);
  assert(handlers);
  const req = {
    params: { id: itemId }, body,
    headers: token === null ? {} : { authorization: "Bearer " + token },
  };
  const res = {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(data) { this.body = data; return this; },
  };
  let execution;
  const next = (index) => {
    const result = handlers[index](req, res, () => { execution = next(index + 1); });
    return result || execution;
  };
  await next(0);
  return res;
}

test("Schema declares all four attributes as optional trimmed strings with empty defaults", () => {
  for (const field of fields) {
    assert.equal(schema[field].type, String);
    assert.equal(schema[field].trim, true);
    assert.equal(schema[field].default, "");
    assert(!schema[field].required);
    assert.equal(schema[field].enum, undefined, "Mobile values must not be restricted");
  }
});

test("POST accepts and trims all attributes; authenticated user owns the piece", async () => {
  const padded = Object.fromEntries(Object.entries(attributes).map(([field, value]) => [field, "  " + value + "  "]));
  const res = await request("post", "/clothes", {
    body: { ...legacy, ...padded, _id: "bbbbbbbbbbbbbbbbbbbbbbbb", userId: stranger },
  });
  assert.equal(res.statusCode, 201);
  assert.equal(res.body.message, "Peça cadastrada com sucesso");
  for (const field of fields) {
    assert.equal(res.body.clothing[field], attributes[field]);
    assert.equal(records.get(id)[field], attributes[field]);
  }
  assert.equal(calls[0].data.userId, owner);
  assert.equal(Object.hasOwn(calls[0].data, "_id"), false);
});

test("POST legacy payload omits attributes and retains the existing response shape", async () => {
  const res = await request("post", "/clothes", { body: { title: "Antiga", description: "Descrição", media: [] } });
  assert.equal(res.statusCode, 201);
  assert.deepEqual(Object.keys(res.body).sort(), ["clothing", "message"]);
  for (const field of fields) assert.equal(res.body.clothing[field], "");
});

for (const field of fields) {
  test("POST accepts only the optional attribute " + field, async () => {
    const res = await request("post", "/clothes", { body: { ...legacy, [field]: attributes[field] } });
    assert.equal(res.statusCode, 201);
    for (const name of fields) assert.equal(res.body.clothing[name], name === field ? attributes[field] : "");
  });
  for (const value of [null, 4, false, [], { value: "invalid" }]) {
    for (const method of ["post", "put"]) {
      test(method + " rejects non-string " + field + ": " + JSON.stringify(value), async () => {
        const before = structuredClone(records.get(id));
        const res = await request(method, method === "post" ? "/clothes" : "/clothes/:id", {
          body: { title: "Peça", description: "Descrição", [field]: value },
        });
        assert.equal(res.statusCode, 400);
        assert.equal(typeof res.body.error, "string");
        assert.equal(calls.length, 0, "Invalid attributes must not reach the model");
        assert.deepEqual(records.get(id), before);
      });
    }
  }
  test("PUT trims " + field + " and preserves every omitted field", async () => {
    records.set(id, { ...structuredClone(legacy), ...attributes });
    const res = await request("put", "/clothes/:id", { body: { [field]: "  Valor novo  " } });
    assert.equal(res.statusCode, 200);
    assert.deepEqual(records.get(id), { ...legacy, ...attributes, [field]: "Valor novo" });
    assert.deepEqual(calls, [{
      operation: "update", filter: { _id: id, userId: owner },
      update: { $set: { [field]: "Valor novo" } },
      options: { new: true, runValidators: true },
    }]);
  });
  test("PUT explicitly clears " + field + " with an empty/whitespace string", async () => {
    records.set(id, { ...structuredClone(legacy), ...attributes });
    const res = await request("put", "/clothes/:id", { body: { [field]: "  " } });
    assert.equal(res.statusCode, 200);
    assert.equal(records.get(id)[field], "");
    for (const name of fields.filter((name) => name !== field)) assert.equal(records.get(id)[name], attributes[name]);
  });
  test("PUT cannot change another user's " + field, async () => {
    const before = structuredClone(records.get(id));
    const res = await request("put", "/clothes/:id", { token: "stranger", body: { [field]: "Tentativa" } });
    assert.equal(res.statusCode, 404);
    assert.deepEqual(records.get(id), before);
    assert.deepEqual(calls[0].filter, { _id: id, userId: stranger });
  });
  test("PUT rejects operator inside " + field, async () => {
    const res = await request("put", "/clothes/:id", { body: { [field]: { $set: "injected" } } });
    assert.equal(res.statusCode, 400);
    assert.equal(calls.length, 0);
  });
}

for (const condition of ["Nova", "Seminova", "Usada"]) {
  test("Mobile payload with condition " + condition + " remains compatible without style", async () => {
    const res = await request("post", "/clothes", {
      body: { title: "Body infantil", description: "Peça fictícia", category: "Body", size: "RN", condition, media: legacy.media },
    });
    assert.equal(res.statusCode, 201);
    assert.equal(res.body.clothing.condition, condition);
    assert.equal(res.body.clothing.size, "RN");
    assert.equal(res.body.clothing.style, "");
  });
}

for (const [path, isArray] of [["/clothes", true], ["/my-clothes", true], ["/clothes/:id", false]]) {
  test("GET " + path + " normalizes legacy attributes in memory without writing", async () => {
    const before = structuredClone(records.get(id));
    const res = await request("get", path);
    assert.equal(res.statusCode, 200);
    const clothing = isArray ? res.body[0] : res.body;
    for (const field of fields) assert.equal(clothing[field], "");
    assert.equal(clothing.title, legacy.title);
    assert.deepEqual(records.get(id), before);
    assert(calls.every((call) => ["find", "findById"].includes(call.operation)));
    if (path === "/clothes") assert.equal(clothing.likesCount, 3);
  });
}

test("GET preserves populated ownership and already saved attributes", async () => {
  const stored = { ...legacy, ...attributes, userId: { _id: owner, name: "Pessoa fictícia" } };
  records.set(id, structuredClone(stored));
  const res = await request("get", "/clothes/:id");
  assert.deepEqual(res.body, stored);
});

test("GET detail still returns 404 for a missing piece", async () => {
  const res = await request("get", "/clothes/:id", { itemId: "bbbbbbbbbbbbbbbbbbbbbbbb" });
  assert.equal(res.statusCode, 404);
});

test("PUT on a legacy piece does not persist response-only empty defaults", async () => {
  const res = await request("put", "/clothes/:id", { body: { style: "Casual" } });
  assert.equal(res.statusCode, 200);
  assert.deepEqual(records.get(id), { ...legacy, style: "Casual" });
  assert.deepEqual(res.body.clothing, { ...legacy, ...emptyAttributes, style: "Casual" });
});

test("PUT changing only title preserves all stored attributes", async () => {
  records.set(id, { ...structuredClone(legacy), ...attributes });
  const res = await request("put", "/clothes/:id", { body: { title: "Título novo" } });
  assert.equal(res.statusCode, 200);
  assert.deepEqual(records.get(id), { ...legacy, ...attributes, title: "Título novo" });
});

test("PUT still ignores ownership changes while accepting all attributes", async () => {
  const res = await request("put", "/clothes/:id", { body: { ...attributes, userId: stranger, _id: "bbbbbbbbbbbbbbbbbbbbbbbb" } });
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.clothing.userId, owner);
  assert.equal(res.body.clothing._id, id);
  assert.deepEqual(calls[0].update, { $set: attributes });
});

for (const method of ["post", "put"]) {
  test(method + " with no authentication stays 401 without model access", async () => {
    const res = await request(method, method === "post" ? "/clothes" : "/clothes/:id", { token: null, body: attributes });
    assert.equal(res.statusCode, 401);
    assert.equal(calls.length, 0);
  });
}

for (const name of ["ValidationError", "CastError"]) {
  test("POST maps model " + name + " to a safe 400 response", async () => {
    modelError = Object.assign(new Error("Internal diagnostic"), { name });
    const res = await request("post", "/clothes", { body: legacy });
    assert.equal(res.statusCode, 400);
    assert.deepEqual(res.body, { error: "Dados da peça inválidos" });
  });
}

test("Swagger describes optional attributes, JSON input, partial PUT and ownership outcomes", () => {
  for (const name of ["Clothing", "ClothingInput", "ClothingUpdateInput"]) {
    const definition = swagger.components.schemas[name];
    for (const field of fields) {
      assert.equal(definition.properties[field].type, "string");
      assert.equal(definition.properties[field].default, "");
      assert(!definition.required?.includes(field));
    }
  }
  assert(swagger.paths["/clothes"].post.requestBody.content["application/json"]);
  assert(swagger.paths["/clothes"].post.responses[400]);
  const put = swagger.paths["/clothes/{id}"].put;
  assert.deepEqual(put.security, [{ bearerAuth: [] }]);
  for (const status of [200, 400, 401, 404]) assert(put.responses[status]);
  assert.equal(swagger.components.schemas.ClothingUpdateInput.properties.userId, undefined);
  assert.equal(swagger.components.schemas.ClothingUpdateInput.properties._id, undefined);
});
