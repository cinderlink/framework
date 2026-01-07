#!/usr/bin/env bun
/**
 * Migrate all test files from vitest to Bun test runner
 * Updates imports and API calls
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function migrateTestFile(filePath: string) {
  try {
    let content = readFileSync(filePath, 'utf-8');
    let modified = false;

    // Replace vitest imports with bun:test
    if (content.includes("from 'vitest'")) {
      content = content.replace(
        /import\s+{([^}]+)}\s+from\s+['"]vitest['"]/,
        (match, imports) => {
          // Map vitest imports to bun:test
          const importMap = imports
            .split(',')
            .map((imp: string) => imp.trim())
            .map((imp: string) => {
              if (imp === 'vi') return ''; // Remove vi import
              if (imp === 'beforeEach') return `beforeEach`;
              if (imp === 'afterEach') return `afterEach`;
              if (imp === 'describe') return `describe`;
              if (imp === 'it' || imp === 'test') return `it`;
              if (imp === 'expect') return `expect`;
              return imp;
            })
            .filter(Boolean)
            .join(', ');
          
          return `import { ${importMap} } from 'bun:test'`;
        }
      );
      modified = true;
    }

    // Replace vi.fn() with mock.fn()
    content = content.replace(/\bvi\.fn\(/g, 'mock.fn(');
    content = content.replace(/\bvi\.mocked\(/g, 'mock.mocked(');
    
    // Replace vi.spyOn() with mock.spyOn()
    content = content.replace(/\bvi\.spyOn\(/g, 'mock.spyOn(');
    content = content.replace(/\bvi\.clearAllMocks\(\)/g, 'mock.restoreAll()');
    content = content.replace(/\bvi\.resetAllMocks\(\)/g, 'mock.restoreAll()');
    content = content.replace(/\bvi\.restoreAllMocks\(\)/g, 'mock.restoreAll()');

    // Replace vi.mock() with mock.module()
    content = content.replace(/\bvi\.mock\(/g, 'mock.module(');

    if (modified) {
      writeFileSync(filePath, content);
      console.log(`✅ Migrated ${filePath}`);
      return true;
    }
    return false;
  } catch (error: unknown) {
    console.error(`❌ Failed to migrate ${filePath}:`, error);
    return false;
  }
}

function migratePackage(pkgDir: string) {
  const testFiles: string[] = [];
  
  function findTestFiles(dir: string) {
    const items = readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
      const fullPath = join(dir, item.name);
      if (item.isDirectory() && !item.name.includes('node_modules')) {
        findTestFiles(fullPath);
      } else if (item.isFile() && (fullPath.endsWith('.test.ts') || fullPath.endsWith('.spec.ts'))) {
        testFiles.push(fullPath);
      }
    }
  }
  
  findTestFiles(pkgDir);
  
  console.log(`\n📝 Processing ${testFiles.length} test files in ${pkgDir}`);
  
  let migrated = 0;
  testFiles.forEach(file => {
    if (migrateTestFile(file)) migrated++;
  });
  
  console.log(`   Migrated: ${migrated}/${testFiles.length}`);
  return migrated;
}

// Migrate all packages
const packages = readdirSync('packages', { withFileTypes: true })
  .filter(dirent => dirent.isDirectory())
  .map(dirent => join('packages', dirent.name));

console.log('🔄 Migrating test files from vitest to Bun...\n');

let totalMigrated = 0;
packages.forEach(pkg => {
  totalMigrated += migratePackage(pkg);
});

console.log(`\n✅ Total files migrated: ${totalMigrated}`);
console.log('💡 Next steps:');
console.log('   1. Review migrated test files');
console.log('   2. Run: bun test:packages');
console.log('   3. Fix any remaining issues');
