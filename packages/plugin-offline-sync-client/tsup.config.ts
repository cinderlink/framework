import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/**/*.ts", "!src/**/*.test.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  external: [
    "@candor/protocol",
    "@candor/core-types",
    "@candor/ipld-database",
    "@candor/plugin-offline-sync-core",
    "emittery",
    "dids",
    "multiformats",
    "@multiformats/multiaddr",
    "did-jwt",
    "uuid",
    "date-fns",
  ],
});
