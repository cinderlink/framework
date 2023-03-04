import { SocialSyncConfig } from "@candor/plugin-social-core";
export default {
  seed: "6149b702ec3cb34951460e27c9e35a795941e466a6af90b288468016780f37bf",
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
        API: ["/ip4/127.0.0.1/tcp/5001"],
        Gateway: ["/ip4/127.0.0.1/tcp/8080"],
      },
      Bootstrap: [],
    },
  },
};
