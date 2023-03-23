import path from "path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
  build: {
    outDir: path.resolve(__dirname, "dist/browser"),
    lib: {
      entry: path.resolve(__dirname, "src/index.ts"),
      name: "@cinderlink/client",
      fileName: (format) => `cinderlink.${format}.js`,
    },
  },
  // output .d.ts files
  plugins: [dts()],
});
