import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/**/*.ts", "!src/**/*.test.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  external: [
    "@cinderlink/protocol",
    "@cinderlink/core-types",
    "@cinderlink/ipld-database",
    "@cinderlink/plugin-offline-sync-core",
    "emittery",
    "dids",
    "multiformats",
    "@multiformats/multiaddr",
    "did-jwt",
    "uuid",
    "date-fns",
  ],
});
