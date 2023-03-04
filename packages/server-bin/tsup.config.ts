import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/**/*.ts", "!src/**/*.test.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  external: [
    "@candor/server",
    "ipfs-http-gateway",
    "ipfs-http-server",
    "minimist",
    "@candor/identifiers",
    "@candor/plugin-identity-server",
    "@candor/plugin-offline-sync-server",
    "@candor/plugin-social-server",
    "@candor/protocol",
    "chalk",
    "ethers",
  ],
});
