#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';

async function fixLintErrors() {
  const files = await glob('packages/*/src/**/*.{ts,js}', {
    ignore: ['**/node_modules/**', '**/dist/**', '**/.tshy-build/**']
  });
  
  console.log(`Found ${files.length} source files to check`);
  
  for (const file of files) {
    try {
      let content = readFileSync(file, 'utf-8');
      let modified = false;
      
      // Fix duplicate imports
      const importRegex = /import\s*(?:type\s*)?{([^}]+)}\s*from\s*["']([^"']+)["'];/g;
      const imports = new Map();
      
      let match;
      while ((match = importRegex.exec(content)) !== null) {
        const [fullMatch, importsList, module] = match;
        if (!imports.has(module)) {
          imports.set(module, new Set());
        }
        const importItems = importsList.split(',').map(i => i.trim());
        importItems.forEach(item => imports.get(module).add(item));
      }
      
      // Check for duplicates
      const duplicates = new Map();
      for (const [module, importSet] of imports) {
        const importMatches = content.match(new RegExp(`import[^;]*from\\s*["']${module.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'];`, 'g'));
        if (importMatches && importMatches.length > 1) {
          duplicates.set(module, importSet);
        }
      }
      
      // Fix duplicates
      for (const [module, allImports] of duplicates) {
        const importArray = Array.from(allImports);
        const typeImports = importArray.filter(i => i.startsWith('type '));
        const regularImports = importArray.filter(i => !i.startsWith('type '));
        
        let newImport = '';
        if (regularImports.length > 0 && typeImports.length > 0) {
          newImport = `import { ${regularImports.join(', ')} } from "${module}";\nimport type { ${typeImports.map(i => i.replace('type ', '')).join(', ')} } from "${module}";`;
        } else if (typeImports.length > 0) {
          newImport = `import type { ${typeImports.map(i => i.replace('type ', '')).join(', ')} } from "${module}";`;
        } else {
          newImport = `import { ${regularImports.join(', ')} } from "${module}";`;
        }
        
        // Replace all occurrences with the first one
        const regex = new RegExp(`import[^;]*from\\s*["']${module.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'];`, 'g');
        let isFirst = true;
        content = content.replace(regex, (match) => {
          if (isFirst) {
            isFirst = false;
            return newImport;
          }
          return '';
        });
        
        // Clean up empty lines
        content = content.replace(/\n\n+/g, '\n\n');
        modified = true;
      }
      
      // Fix async functions without await
      const asyncFunctionRegex = /async\s+(\w+)\s*\([^)]*\)\s*(?::[^{]+)?\s*{([^}]*)}/g;
      content = content.replace(asyncFunctionRegex, (match, functionName, body) => {
        if (!body.includes('await')) {
          // Remove async keyword
          return match.replace(/async\s+/, '');
        }
        return match;
      });
      
      // Fix == to ===
      content = content.replace(/([^=!])={2}([^=])/g, '$1===$2');
      content = content.replace(/([^=!])!={1}([^=])/g, '$1!==$2');
      
      // Fix require-await for arrow functions
      content = content.replace(/async\s*\(([^)]*)\)\s*=>\s*{([^}]*)}/g, (match, params, body) => {
        if (!body.includes('await')) {
          return `(${params}) => {${body}}`;
        }
        return match;
      });
      
      // Fix unused variables by prefixing with _
      // This is more complex and should be done carefully
      // For now, we'll just fix the common cases in catch blocks
      content = content.replace(/catch\s*\((\w+)\)\s*{/g, (match, varName) => {
        // Check if the variable is used in the catch block
        const catchBlockMatch = match + content.split(match)[1].split('}')[0] + '}';
        if (!catchBlockMatch.includes(varName + '.') && !catchBlockMatch.includes(varName + '[')) {
          return `catch (_${varName}) {`;
        }
        return match;
      });
      
      if (modified || content !== readFileSync(file, 'utf-8')) {
        writeFileSync(file, content);
        console.log(`  ✅ Fixed ${file}`);
      }
    } catch (error) {
      console.error(`  ❌ Error processing ${file}:`, error.message);
    }
  }
  
  console.log('\nDone! Run "bun run lint" to check remaining issues.');
}

fixLintErrors().catch(console.error);