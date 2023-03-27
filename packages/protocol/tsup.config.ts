import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/**/*.ts", "!src/**/*.test.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  external: [
    "@cinderlink/core-types",
    "@cinderlink/tsconfig",
    "@libp2p/interface-connection",
    "did-jwt",
    "dids",
    "emittery",
    "it-length-prefixed",
    "it-map",
    "it-pipe",
    "it-pushable",
    "libp2p",
    "multiformats",
    "uuid",
  ],
});
