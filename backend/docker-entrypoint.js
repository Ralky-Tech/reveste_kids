import mongoose from "mongoose";
import dns from "node:dns";
import { isIP } from "node:net";

// Docker-only bootstrap: do not use container startup to migrate Atlas.
mongoose.set("autoIndex", false);
mongoose.set("autoCreate", false);

if (process.env.DOCKER_DNS_SERVER) {
  const server = process.env.DOCKER_DNS_SERVER.trim();
  if (!isIP(server)) throw new Error("Invalid container DNS server.");
  dns.setServers([server]);
}

await import("./index.js");
