import * as fs from "fs";
import * as path from "path";

const PACKAGES_DIR = "packages";
const dirs = fs.readdirSync(PACKAGES_DIR);

for (const dir of dirs) {
  const pkgPath = path.join(PACKAGES_DIR, dir, "package.json");
  if (!fs.existsSync(pkgPath)) continue;

  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
  let modified = false;

  // Update main
  if (pkg.main?.includes("dist")) {
    pkg.main = pkg.main.replace("dist", "src").replace(".js", ".ts");
    modified = true;
  }

  // Update types
  if (pkg.types?.includes("dist")) {
    pkg.types = pkg.types.replace("dist", "src").replace(".d.ts", ".ts");
    modified = true;
  }

    // Update exports
    if (pkg.exports) {
      let exportsChanged = false;
      
      const updateExports = (exports: any): void => {
        if (typeof exports === "string") {
          if (exports.includes("dist") || exports.endsWith(".js") || exports.endsWith(".d.ts")) {
            exportsChanged = true;
            exports = exports.replace(/\.js$|\.d\.ts$/g, ".ts").replace("dist", "src");
          }
          return;
        }
        
        if (typeof exports === "object") {
          for (const key in exports) {
            const value = exports[key];
            if (typeof value === "string") {
              if (value.includes("dist") || value.endsWith(".js") || value.endsWith(".d.ts") || value.includes("esm") || value.includes("commonjs")) {
                exports[key] = "./src/index.ts";
                exportsChanged = true;
              }
            } else if (typeof value === "object") {
              updateExports(value);
            }
          }
        }
      };

      updateExports(pkg.exports);
      if (exportsChanged) modified = true;
    }

  // Update files
  if (pkg.files && pkg.files.includes("dist")) {
    pkg.files = pkg.files.map((f: string) => f === "dist" ? "src" : f);
    modified = true;
  }

  // Update scripts
  if (pkg.scripts?.build?.includes("build.ts")) {
    delete pkg.scripts.build;
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
    console.log(`✅ Updated ${dir}/package.json`);
  }
}

console.log("\n✨ Done! All packages now point to TypeScript source");
