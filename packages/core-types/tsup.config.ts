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
    "ajv",
    "did-jwt",
    "dids",
    "emittery",
    "ipfs-core-types",
    "libp2p",
    "minisearch",
    "multiformats",
  ],
});