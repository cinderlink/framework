import { createServer } from "@cinderlink/server";
import { createSeed } from "@cinderlink/client";

import CinderlinkProtocolPlugin from "@cinderlink/protocol";
import SocialServerPlugin from "@cinderlink/plugin-social-server";
import IdentityServerPlugin from "@cinderlink/plugin-identity-server";
import OfflineSyncServerPlugin from "@cinderlink/plugin-offline-sync-server";

const seed = await createSeed(
  "sufficiently long seed phrase that nobody will ever guess"
);
const server = await createServer(
  seed,
  [
    [CinderlinkProtocolPlugin, {}],
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
