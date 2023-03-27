import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/**/*.ts", "!src/**/*.test.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  external: [
    "@cinderlink/identifiers",
    "@cinderlink/core-types",
    "@cinderlink/plugin-social-client",
    "@cinderlink/plugin-social-core",
    "did-jwt",
    "dids",
    "did-jwt",
    "dids",
  ],
});
