import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/**/*.ts", "!src/**/*.test.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  external: [
    "@cinderlink/client",
    "@cinderlink/core-types",
    "@cinderlink/tsconfig",
    "ipfs-core",
    "ipfs-core-types",
    "ipfs-http-gateway",
    "ipfs-http-server",
  ],
});
