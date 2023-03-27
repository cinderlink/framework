import { SocialSyncConfig } from "@cinderlink/plugin-social-core";
export default {
  app: "cinderlink-example",
  mnemonic:
    "vehicle canvas nerve wage orbit resist radio fresh scorpion manage loyal client",
  accountNonce: 0,
  plugins: [
    [
      "@cinderlink/plugin-sync-db",
      {
        syncing: {
          social: SocialSyncConfig,
        },
      },
    ],
    ["@cinderlink/plugin-social-server"],
    ["@cinderlink/plugin-identity-server"],
    ["@cinderlink/plugin-offline-sync-server"],
  ],
  ipfs: {
    config: {
      Addresses: {
        Swarm: ["/ip4/127.0.0.1/tcp/4001", "/ip4/127.0.0.1/tcp/4002/ws"],
        API: ["/ip4/127.0.0.1/tcp/5001"],
        Gateway: ["/ip4/127.0.0.1/tcp/8080"],
      },
      Bootstrap: [],
    },
  },
};
