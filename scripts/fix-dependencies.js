#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';

// Target versions to standardize across all packages
const TARGET_VERSIONS = {
  '@multiformats/multiaddr': '^12.5.1',
  'did-jwt': '^8.0.17',
};

async function updatePackageVersions() {
  // Find all package.json files
  const packageFiles = await glob('packages/*/package.json');
  
  console.log(`Found ${packageFiles.length} package.json files to update`);
  
  for (const packageFile of packageFiles) {
    try {
      const content = readFileSync(packageFile, 'utf-8');
      const pkg = JSON.parse(content);
      let modified = false;
      
      // Update dependencies
      if (pkg.dependencies) {
        for (const [dep, targetVersion] of Object.entries(TARGET_VERSIONS)) {
          if (pkg.dependencies[dep] && pkg.dependencies[dep] !== targetVersion) {
            console.log(`  ${packageFile}: Updating ${dep} from ${pkg.dependencies[dep]} to ${targetVersion}`);
            pkg.dependencies[dep] = targetVersion;
            modified = true;
          }
        }
      }
      
      // Update devDependencies
      if (pkg.devDependencies) {
        for (const [dep, targetVersion] of Object.entries(TARGET_VERSIONS)) {
          if (pkg.devDependencies[dep] && pkg.devDependencies[dep] !== targetVersion) {
            console.log(`  ${packageFile}: Updating ${dep} from ${pkg.devDependencies[dep]} to ${targetVersion}`);
            pkg.devDependencies[dep] = targetVersion;
            modified = true;
          }
        }
      }
      
      // Write back if modified
      if (modified) {
        writeFileSync(packageFile, JSON.stringify(pkg, null, 2) + '\n');
        console.log(`  ✅ Updated ${packageFile}`);
      }
    } catch (error) {
      console.error(`  ❌ Error updating ${packageFile}:`, error.message);
    }
  }
  
  console.log('\nDone! Run "bun install" to update lockfile.');
}

updatePackageVersions().catch(console.error);