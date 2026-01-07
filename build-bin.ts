import * as fs from "fs";
import * as path from "path";

const OUTPUT_DIR = "dist/bins";
const SERVER_BIN_ENTRY = "packages/server-bin/src/bin.ts";

async function buildBinaries() {
  console.log("🔨 Building binaries...");

  // Create output directory
  if (fs.existsSync(OUTPUT_DIR)) {
    fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // Check if server-bin entry exists
  if (!fs.existsSync(SERVER_BIN_ENTRY)) {
    console.error(`❌ Server bin entry not found: ${SERVER_BIN_ENTRY}`);
    process.exit(1);
  }

  // Build server binary with Bun
  try {
    console.log("  Building server binary...");
    
    await Bun.build({
      entrypoints: [SERVER_BIN_ENTRY],
      outdir: OUTPUT_DIR,
      target: "bun",
      format: "esm",
      sourcemap: "external",
      external: [
        // Externalize all workspace dependencies
        "@cinderlink/tsconfig",
        "@cinderlink/core-types",
        "@cinderlink/identifiers",
        "@cinderlink/protocol",
        "@cinderlink/schema-registry",
        "@cinderlink/ipld-database",
        "@cinderlink/test-adapters",
        "@cinderlink/client",
        "@cinderlink/server",
        "@cinderlink/plugin-identity-server",
        "@cinderlink/plugin-offline-sync-core",
        "@cinderlink/plugin-offline-sync-server",
        "@cinderlink/plugin-offline-sync-client",
        "@cinderlink/plugin-rcon-server",
        "@cinderlink/plugin-social-core",
        "@cinderlink/plugin-social-server",
        "@cinderlink/plugin-social-client",
        "@cinderlink/plugin-sync-db",
        "zod",
        "vitest",
        "multiformats",
        "libp2p",
        "helia",
        "dids",
        "did-jwt",
        "emittery",
        "minisearch",
        "ajv",
        "it-pushable",
      ],
      minify: false,
    });

    console.log("  ✅ Built server binary");

    // Make binary executable
    const binPath = path.join(OUTPUT_DIR, "bin.js");
    if (process.platform !== "win32") {
      fs.chmodSync(binPath, "755");
      console.log("  ✅ Made binary executable");
    }

    console.log(`\n✅ Binary built: ${binPath}`);
  } catch (error: any) {
    console.error(`  ❌ Build failed: ${error.message}`);
    process.exit(1);
  }
}

buildBinaries().catch((error) => {
  console.error("❌ Binary build error:", error);
  process.exit(1);
});
