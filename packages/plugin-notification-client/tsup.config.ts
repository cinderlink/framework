import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/**/*.ts", "!src/**/*.test.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  external: [
    "@candor/core-types",
    "@candor/ipld-database",
    "@candor/plugin-social-client",
  ],
});
