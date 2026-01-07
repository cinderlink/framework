#!/usr/bin/env bun
import { spawn } from 'child_process';

const packages = [
  '@cinderlink/core-types'
];

console.log('📝 Generating type declarations...\n');

for (const pkg of packages) {
  const packagePath = pkg.replace('@cinderlink/', '');
  const fullPath = `packages/${packagePath}`;
  const tsconfigPath = `${fullPath}/tsconfig.json`;

  console.log(`🏗️ Generating types for ${pkg}...`);

  const tscProcess = spawn('bun', [
    'tsc',
    '--project',
    tsconfigPath
  ], {
    cwd: process.cwd(),
    stdio: 'inherit'
  });

  await new Promise<void>((resolve, reject) => {
    tscProcess.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ Generated types for ${pkg}\n`);
        resolve();
      } else {
        console.error(`❌ Failed to generate types for ${pkg}`);
        reject(new Error(`tsc exited with code ${code}`));
      }
    });
  });
}

console.log('🎉 Type generation complete!');
