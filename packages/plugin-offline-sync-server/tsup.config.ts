import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/**/*.ts", "!src/**/*.test.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  external: [
    "@candor/core-types",
    "@candor/plugin-offline-sync-client",
    "@candor/plugin-offline-sync-core",
    "@candor/protocol",
    "@candor/tsconfig",
    "did-jwt",
    "dids",
    "did-jwt",
    "dids",
  ],
});
