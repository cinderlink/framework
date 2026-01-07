import * as fs from "fs";
import * as path from "path";

const PACKAGES_DIR = "packages";

console.log("📦 Packages are distributed as TypeScript source - no pre-building needed");
console.log("💡 Consumers can bundle with Bun.build or use TypeScript directly");
console.log("🔨 Only building server-bin to standalone binary...");

const BIN_DIR = path.join(PACKAGES_DIR, "server-bin");
if (!fs.existsSync(BIN_DIR)) {
  console.error("❌ server-bin package not found");
  process.exit(1);
}

const BIN_ENTRY = path.join(BIN_DIR, "src", "bin.ts");
if (!fs.existsSync(BIN_ENTRY)) {
  console.error("❌ server-bin entry not found");
  process.exit(1);
}

const OUTPUT_DIR = "dist/bins";
if (fs.existsSync(OUTPUT_DIR)) {
  fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
}
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

console.log("Building server binary...");

// Build using bun build --compile for standalone executable
const { execSync } = require("child_process");

try {
  const binPath = path.join(OUTPUT_DIR, "cinderlink");
  execSync(`bun build --compile ${BIN_ENTRY} --outfile ${binPath}`, {
    stdio: "inherit",
  });

  if (process.platform !== "win32") {
    fs.chmodSync(binPath, "755");
    console.log("✅ Made binary executable");
  }

  console.log(`✅ Binary built: ${binPath}`);
} catch (error) {
  console.error("❌ Build failed:", error);
  process.exit(1);
}
