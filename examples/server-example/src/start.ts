import { createServer } from "@candor/server";
import { createSeed } from "@candor/client";

import CandorProtocolPlugin from "@candor/protocol";
import SocialServerPlugin from "@candor/plugin-social-server";
import IdentityServerPlugin from "@candor/plugin-identity-server";
import OfflineSyncServerPlugin from "@candor/plugin-offline-sync-server";

const seed = await createSeed(
  "sufficiently long seed phrase that nobody will ever guess"
);
const server = await createServer(
  seed,
  [
    [CandorProtocolPlugin, {}],
    [SocialServerPlugin, {}],
    [IdentityServerPlugin, {}],
    [OfflineSyncServerPlugin, {}],
  ],
  [
    // federated servers
  ],
  {
    config: {
      Addresses: {
        Swarm: ["/ip4/127.0.0.1/tcp/4001", "/ip4/127.0.0.1/tcp/4002/ws"],
        API: ["/ip4/127.0.0.1/tcp/5001"],
        Gateway: ["/ip4/127.0.0.1/tcp/8080"],
      },
      Bootstrap: [],
    },
    Bootstrap: [],
  }
);
await server.start();
