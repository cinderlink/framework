import { createServer } from "@cinderlink/server";
import { createSeed } from "@cinderlink/identifiers";

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
        Swarm: ["/ip4/127.0.0.1/tcp/4500", "/ip4/127.0.0.1/tcp/4501/ws"],
        API: ["/ip4/127.0.0.1/tcp/4502"],
        Gateway: ["/ip4/127.0.0.1/tcp/4503"],
      },
      Bootstrap: [],
    },
    Bootstrap: [],
  }
);
await server.start();
