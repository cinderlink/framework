import { SocialSyncConfig } from "@candor/plugin-social-core";
export default {
  app: "candor.social",
  mnemonic:
    "vehicle canvas nerve wage orbit resist radio fresh scorpion manage loyal client",
  accountNonce: 0,
  plugins: [
    ["@candor/protocol"],
    ["@candor/plugin-social-server"],
    ["@candor/plugin-identity-server"],
    ["@candor/plugin-offline-sync-server"],
    [
      "@candor/plugin-sync-db",
      {
        schemas: {
          ...SocialSyncConfig,
        },
      },
    ],
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
