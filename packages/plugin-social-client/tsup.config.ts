import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/**/*.ts", "!src/**/*.test.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  treeshake: true,
  clean: true,
  target: ["chrome112", "firefox89", "safari14", "edge92", "node16"],
  external: [
    "@cinderlink/client",
    "@cinderlink/identifiers",
    "@cinderlink/ipld-database",
    "@cinderlink/plugin-offline-sync-core",
    "@cinderlink/plugin-social-core",
    "@cinderlink/plugin-sync-db",
    "@cinderlink/protocol",
    "@multiformats/multiaddr",
    "did-jwt",
    "dids",
    "emittery",
    "multiformats",
  ],
});
