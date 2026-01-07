#!/usr/bin/env bun
import { spawn } from 'child_process';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

interface TestResult {
  package: string;
  success: boolean;
  testCount?: number;
  duration?: string;
  error?: string;
}

const PACKAGES_DIR = './packages';

async function getPackages(): Promise<string[]> {
  const entries = await readdir(PACKAGES_DIR, { withFileTypes: true });
  return entries
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort();
}

async function hasTestScript(packageName: string): Promise<boolean> {
  try {
    const packageJsonPath = join(PACKAGES_DIR, packageName, 'package.json');
    const content = await readFile(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(content);
    return !!packageJson.scripts?.test;
  } catch {
    return false;
  }
}

function runTest(packageName: string): Promise<TestResult> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const child = spawn('bun', ['run', 'test'], {
      cwd: join(PACKAGES_DIR, packageName),
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      const duration = `${Date.now() - startTime}ms`;
      const output = stdout + stderr;
      
      if (code === 0) {
        // Parse test count from vitest output
        const testMatch = output.match(/Tests\s+(\d+)\s+passed/);
        const testCount = testMatch ? parseInt(testMatch[1]) : undefined;
        
        resolve({
          package: packageName,
          success: true,
          testCount,
          duration
        });
      } else {
        // Check if it's just "no tests found"
        if (output.includes('No test files found')) {
          resolve({
            package: packageName,
            success: true,
            testCount: 0,
            duration,
            error: 'No tests found'
          });
        } else {
          resolve({
            package: packageName,
            success: false,
            duration,
            error: output.trim() || `Exit code: ${code}`
          });
        }
      }
    });

    child.on('error', (error) => {
      resolve({
        package: packageName,
        success: false,
        error: error.message
      });
    });
  });
}

async function main() {
  console.log('🧪 Running tests for all packages...\n');
  
  const allPackages = await getPackages();
  const results: TestResult[] = [];
  
  // Filter packages that have test scripts and those that don't
  const packageChecks = await Promise.all(
    allPackages.map(async (pkg) => ({
      name: pkg,
      hasTests: await hasTestScript(pkg)
    }))
  );
  
  const packagesToTest = packageChecks.filter(p => p.hasTests).map(p => p.name);
  const packagesWithoutTests = packageChecks.filter(p => !p.hasTests).map(p => p.name);
  
  // Add no-test packages to results
  packagesWithoutTests.forEach(pkg => {
    results.push({
      package: pkg,
      success: true,
      testCount: 0,
      duration: '0ms',
      error: 'No test script'
    });
  });
  
  // Run tests in parallel with limited concurrency
  const BATCH_SIZE = 4;
  for (let i = 0; i < packagesToTest.length; i += BATCH_SIZE) {
    const batch = packagesToTest.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(pkg => runTest(pkg))
    );
    results.push(...batchResults);
    
    // Show progress
    batchResults.forEach(result => {
      const status = result.success ? '✅' : '❌';
      const testInfo = result.testCount !== undefined 
        ? ` (${result.testCount} tests)` 
        : '';
      const errorInfo = result.error && result.error !== 'No tests found' && result.error !== 'No test script'
        ? ` - ${result.error.split('\n')[0].substring(0, 60)}...`
        : '';
      
      console.log(`${status} @cinderlink/${result.package}${testInfo} ${result.duration}${errorInfo}`);
    });
  }
  
  // Show packages without test scripts
  if (packagesWithoutTests.length > 0) {
    packagesWithoutTests.forEach(pkg => {
      console.log(`⚪ @cinderlink/${pkg} (no test script) 0ms`);
    });
  }
  
  // Summary
  console.log('\n📊 Test Summary:');
  console.log('═'.repeat(50));
  
  const passed = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  const totalTests = results.reduce((sum, r) => sum + (r.testCount || 0), 0);
  
  console.log(`✅ Passed: ${passed.length}/${results.length} packages`);
  console.log(`🧪 Total tests: ${totalTests}`);
  
  if (failed.length > 0) {
    console.log(`❌ Failed: ${failed.length} packages`);
    console.log('\nFailures:');
    failed.forEach(result => {
      console.log(`  • @cinderlink/${result.package}`);
      if (result.error) {
        console.log(`    ${result.error.split('\n')[0]}`);
      }
    });
  }
  
  // Exit with appropriate code
  process.exit(failed.length > 0 ? 1 : 0);
}

main().catch(console.error);