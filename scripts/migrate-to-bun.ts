#!/usr/bin/env bun
/**
 * Migrate all packages to use Bun test runner
 * Removes vitest, vite, tshy dependencies and configurations
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

const PACKAGES_DIR = 'packages';

function migratePackageJson(pkgDir: string) {
  const pkgPath = join(pkgDir, 'package.json');
  
  try {
    const content = readFileSync(pkgPath, 'utf-8');
    const pkg = JSON.parse(content);
    
    let modified = false;
    
    // Remove vitest from scripts
    if (pkg.scripts) {
      Object.keys(pkg.scripts).forEach((key: string) => {
        if (pkg.scripts[key].includes('vitest')) {
          // Convert vitest commands to bun test
          if (key === 'test') {
            pkg.scripts[key] = 'bun test';
            modified = true;
          } else if (key.startsWith('test:')) {
            // Keep test: scripts but convert to bun test
            pkg.scripts[key] = pkg.scripts[key].replace(/vitest run\s+/, 'bun test ');
            modified = true;
          }
        }
      });
    }
    
    // Remove tshy configuration
    if (pkg.tshy !== undefined) {
      delete pkg.tshy;
      modified = true;
    }
    
    // Remove vite scripts
    if (pkg.scripts) {
      Object.keys(pkg.scripts).forEach((key: string) => {
        if (pkg.scripts[key].includes('vite')) {
          delete pkg.scripts[key];
          modified = true;
        }
      });
    }
    
    // Remove devDependencies
    if (pkg.devDependencies) {
      const depsToRemove = ['vitest', 'vite', 'vite-plugin-dts', '@types/jsdom'];
      depsToRemove.forEach((dep: string) => {
        Object.keys(pkg.devDependencies).forEach((depKey: string) => {
          if (depKey.startsWith(dep) || depKey === dep) {
            delete pkg.devDependencies[depKey];
            modified = true;
          }
        });
      });
    }
    
    if (modified) {
      writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
      console.log(`✅ Updated ${pkgDir}`);
    } else {
      console.log(`⏭️  Skipped ${pkgDir} (no changes needed)`);
    }
  } catch (error: unknown) {
    console.error(`❌ Failed to migrate ${pkgDir}:`, error);
  }
}

// Migrate all packages
const packages = readdirSync(PACKAGES_DIR, { withFileTypes: true })
  .filter(dirent => dirent.isDirectory())
  .map(dirent => join(PACKAGES_DIR, dirent.name));

console.log('🔄 Migrating packages to use Bun test runner...\n');

packages.forEach(migratePackageJson);

console.log('\n✅ Migration complete!');
console.log('💡 Next steps:');
console.log('   1. Run: bun install');
console.log('   2. Run: bun test:packages');
