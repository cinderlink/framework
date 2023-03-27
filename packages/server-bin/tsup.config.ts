import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/**/*.ts", "!src/**/*.test.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  external: [
    "@cinderlink/server",
    "ipfs-http-gateway",
    "ipfs-http-server",
    "minimist",
    "@cinderlink/identifiers",
    "@cinderlink/plugin-identity-server",
    "@cinderlink/plugin-offline-sync-server",
    "@cinderlink/plugin-social-server",
    "@cinderlink/protocol",
    "chalk",
    "ethers",
  ],
});
