import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/**/*.ts", "!src/**/*.test.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  external: [
    "@cinderlink/core-types",
    "@cinderlink/plugin-offline-sync-client",
    "@cinderlink/plugin-offline-sync-core",
    "@cinderlink/protocol",
    "@cinderlink/tsconfig",
    "did-jwt",
    "dids",
    "did-jwt",
    "dids",
  ],
});
