import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/**/*.ts", "!src/**/*.test.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  external: [
    "@candor/client",
    "@candor/core-types",
    "@candor/tsconfig",
    "ipfs-core",
    "ipfs-core-types",
    "ipfs-http-gateway",
    "ipfs-http-server",
  ],
});
