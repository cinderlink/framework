#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';

// Get the specific await errors from oxlint
const lintOutput = execSync('bun run lint 2>&1', { encoding: 'utf-8' });
const awaitErrors = [];

// Parse lint output for await errors
const lines = lintOutput.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('await.*is only allowed within async functions')) {
    const nextLine = lines[i + 1];
    if (nextLine && nextLine.includes(',-[')) {
      const match = nextLine.match(/,-\[([^:]+):(\d+):\d+\]/);
      if (match) {
        awaitErrors.push({
          file: match[1],
          line: parseInt(match[2], 10)
        });
      }
    }
  }
}

console.log(`Found ${awaitErrors.length} await errors to fix`);

// Group by file
const fileErrors = {};
awaitErrors.forEach(error => {
  if (!fileErrors[error.file]) {
    fileErrors[error.file] = [];
  }
  fileErrors[error.file].push(error.line);
});

// Fix each file
for (const [filePath, lineNumbers] of Object.entries(fileErrors)) {
  try {
    let content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    console.log(`Fixing ${filePath}: lines ${lineNumbers.join(', ')}`);
    
    // Sort line numbers in descending order to avoid offset issues
    lineNumbers.sort((a, b) => b - a);
    
    for (const lineNum of lineNumbers) {
      const lineIndex = lineNum - 1; // Convert to 0-based index
      if (lineIndex >= 0 && lineIndex < lines.length) {
        
        // Look backwards to find the function declaration
        for (let i = lineIndex; i >= 0; i--) {
          const currentLine = lines[i];
          
          // Skip empty lines and comments
          if (!currentLine.trim() || currentLine.trim().startsWith('//') || currentLine.trim().startsWith('*')) {
            continue;
          }
          
          // Look for function patterns
          if (currentLine.match(/^\s*(it|describe|test|beforeAll|afterAll|beforeEach|afterEach)\s*\(/)) {
            // Test function
            lines[i] = currentLine.replace(/\(([^)]*)\)\s*=>\s*{/, '(async $1) => {').replace(/\(([^)]*)\)\s*{/, '(async $1) {');
            console.log(`  Fixed test function at line ${i + 1}`);
            break;
          } else if (currentLine.match(/^\s*\w+\s*\([^)]*\)\s*[:=]?\s*{/) || 
                     currentLine.match(/^\s*(async\s+)?\w+\s*\([^)]*\)\s*[:=]?\s*{/) ||
                     currentLine.match(/^\s*(async\s+)?\w+\s*\([^)]*\)\s*[:=]?\s*Promise/)) {
            // Method declaration
            if (!currentLine.includes('async')) {
              lines[i] = currentLine.replace(/^(\s*)/, '$1async ');
              console.log(`  Added async to method at line ${i + 1}`);
            }
            break;
          } else if (currentLine.match(/new Promise\s*\(\s*\(([^)]*)\)\s*=>/)) {
            // Promise constructor
            lines[i] = currentLine.replace(/new Promise\s*\(\s*\(([^)]*)\)\s*=>/, 'new Promise(async ($1) =>');
            console.log(`  Fixed Promise constructor at line ${i + 1}`);
            break;
          }
        }
      }
    }
    
    // Write the file back
    const newContent = lines.join('\n');
    if (newContent !== content) {
      writeFileSync(filePath, newContent);
      console.log(`  ✅ Fixed ${filePath}`);
    }
  } catch (error) {
    console.error(`  ❌ Error fixing ${filePath}:`, error.message);
  }
}

console.log('\nDone! Run "bun run lint" to check remaining issues.');