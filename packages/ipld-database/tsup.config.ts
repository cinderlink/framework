import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/**/*.ts", "!src/**/*.test.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  external: [
    "ajv",
    "dids",
    "emittery",
    "minisearch",
    "multiformats",
    "object-sizeof",
    "@candor/core-types",
    "@candor/test-adapters",
    "@candor/tsconfig",
    "dids",
  ],
});
