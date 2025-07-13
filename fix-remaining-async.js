#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Get lint output and extract files with await errors
const lintOutput = execSync('bun run lint', { encoding: 'utf8', stdio: 'pipe' }).toString();
const awaitErrors = lintOutput.match(/,-\[([^:]+):(\d+):\d+\]/g) || [];

const filesToFix = new Set();
awaitErrors.forEach(match => {
  const fileMatch = match.match(/\[([^:]+):/);
  if (fileMatch && fileMatch[1].endsWith('.ts')) {
    filesToFix.add(fileMatch[1]);
  }
});

console.log(`Found ${filesToFix.size} files with await errors`);

// Function patterns that commonly need async
const asyncPatterns = [
  // Method definitions that return Promise but aren't async
  {
    pattern: /^(\s+)([a-zA-Z_][a-zA-Z0-9_]*)\s*\([^)]*\)\s*:\s*Promise<[^>]+>\s*\{/gm,
    replacement: '$1async $2($3): Promise<$4> {'
  },
  // Functions that use await but aren't async
  {
    pattern: /^(\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)\)\s*\{([^}]*await[^}]*)\}/gm,
    replacement: '$1async $2($3) {$4}'
  },
  // Arrow functions in event handlers that use await
  {
    pattern: /\.\s*on\s*\(\s*[^,]+,\s*\(([^)]*)\)\s*=>\s*\{([^}]*await[^}]*)\}/gm,
    replacement: '.on($1, async ($2) => {$3})'
  }
];

// Fix files
filesToFix.forEach(filePath => {
  try {
    const fullPath = path.resolve(filePath);
    if (!fs.existsSync(fullPath)) return;
    
    let content = fs.readFileSync(fullPath, 'utf8');
    let modified = false;
    
    // Look for function definitions that use await but aren't async
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Skip if already async
      if (line.includes('async ')) continue;
      
      // Check if this line starts a function and the next few lines contain await
      if (line.match(/^\s*[a-zA-Z_][a-zA-Z0-9_]*\s*\([^)]*\)\s*[:{]/) || 
          line.match(/^\s*[a-zA-Z_][a-zA-Z0-9_]*\s*\([^)]*\)\s*:\s*Promise/)) {
        
        // Look ahead for await in the function body
        let hasAwait = false;
        let braceCount = 0;
        let started = false;
        
        for (let j = i; j < Math.min(i + 50, lines.length); j++) {
          const checkLine = lines[j];
          if (checkLine.includes('{')) {
            braceCount += (checkLine.match(/\{/g) || []).length;
            started = true;
          }
          if (checkLine.includes('}')) {
            braceCount -= (checkLine.match(/\}/g) || []).length;
          }
          
          if (started && checkLine.includes('await ')) {
            hasAwait = true;
          }
          
          if (started && braceCount <= 0) break;
        }
        
        if (hasAwait) {
          // Add async to the function
          if (line.match(/^\s*[a-zA-Z_][a-zA-Z0-9_]*\s*\(/)) {
            lines[i] = line.replace(/^(\s*)([a-zA-Z_][a-zA-Z0-9_]*\s*\()/, '$1async $2');
            modified = true;
            console.log(`Fixed function at line ${i + 1} in ${filePath}`);
          }
        }
      }
    }
    
    if (modified) {
      fs.writeFileSync(fullPath, lines.join('\n'));
      console.log(`Modified ${filePath}`);
    }
    
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
  }
});