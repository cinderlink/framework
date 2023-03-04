import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/**/*.ts", "!src/**/*.test.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  external: [
    "@candor/identifiers",
    "@candor/core-types",
    "@candor/plugin-social-client",
    "@candor/plugin-social-core",
    "did-jwt",
    "dids",
    "did-jwt",
    "dids",
  ],
});
