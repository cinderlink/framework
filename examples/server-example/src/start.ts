import { createServer } from "@candor/server";
import { createSeed } from "@candor/client";

const seed = await createSeed(
  "sufficiently long seed phrase that nobody will ever guess"
);
const server = await createServer(
  seed,
  [
    // plugins
  ],
  [
    // federated servers
  ],
  {
    // ipfs config
  }
);
await server.start();
