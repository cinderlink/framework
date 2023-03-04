import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/**/*.ts", "!src/**/*.test.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  external: [
    "did",
    "did-jwt",
    "did-resolver",
    "dids",
    "ethers",
    "key-did-provider-ed25519",
    "key-did-resolver",
    "multiformats",
  ],
});
