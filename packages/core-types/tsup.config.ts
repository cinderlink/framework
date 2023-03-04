import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/**/*.ts", "!src/**/*.test.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  external: [
    "did-jwt",
    "dids",
    "emittery",
    "ipfs-core-types",
    "libp2p",
    "multiformats",
    "@candor/tsconfig",
    "@libp2p/interface-connection",
    "@libp2p/interface-peer-id",
    "ajv",
    "it-pushable",
    "minisearch",
  ],
});
