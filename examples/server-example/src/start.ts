import { createServer } from "@cinderlink/server";
import { createSeed } from "@cinderlink/client";

import CinderlinkProtocolPlugin from "@cinderlink/protocol";
import SocialServerPlugin from "@cinderlink/plugin-social-server";
import IdentityServerPlugin from "@cinderlink/plugin-identity-server";
import OfflineSyncServerPlugin from "@cinderlink/plugin-offline-sync-server";

const seed = await createSeed(
  "sufficiently long seed phrase that nobody will ever guess"
);
const server = await createServer({
  ...seed,
  plugins: [
    [CinderlinkProtocolPlugin, {}],
    [SocialServerPlugin, {}],
    [IdentityServerPlugin, {}],
    [OfflineSyncServerPlugin, {}],
  ],
  nodes: [
    // federated servers multiaddrs can go here if any
  ],
  libp2pOptions: {
    addresses: {
      listen: ["/ip4/127.0.0.1/tcp/4001", "/ip4/127.0.0.1/tcp/4002/ws"],
    },
    peerDiscovery: {
      // Assuming bootstrap is a peer discovery mechanism
      bootstrap: {
        list: [], // Add bootstrap node multiaddrs here if any
      },
    },
    // API and Gateway addresses from the old config are not standard libp2p/helia init options.
    // If an HTTP API/Gateway is needed, it should be set up separately, possibly using @helia/http.
  },
  heliaOptions: {
    // Add any Helia specific options here if needed
  },
});
await server.start();
