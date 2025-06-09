import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: false,
  sourcemap: true,
  treeshake: true,
  skipNodeModulesBundle: true,
  bundle: true,
  clean: true,
  target: ["chrome112", "firefox89", "safari14", "edge92", "node16"],
});
