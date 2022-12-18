import { createCryptidsSeed } from "@cryptids/client";
import { createCryptidsServer } from "../dist/index.js";
import { HttpApi } from "ipfs-http-server";
import { HttpGateway } from "ipfs-http-gateway";
const seed = await createCryptidsSeed("test server A");
const server = await createCryptidsServer(seed, [], {
  config: {
    Addresses: {
      Swarm: ["/ip4/127.0.0.1/tcp/4001", "/ip4/127.0.0.1/tcp/4002/ws"],
      API: ["/ip4/127.0.0.1/tcp/5001"],
      Gateway: ["/ip4/127.0.0.1/tcp/8080"],
    },
    Bootstrap: [],
  },
});
await server.start();
const api = new HttpApi(server.client.ipfs);
const gateway = new HttpGateway(server.client.ipfs);
await api.start();
await gateway.start();
