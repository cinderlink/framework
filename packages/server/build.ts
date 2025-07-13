// Build ESM bundle
await Bun.build({
  entrypoints: ['./src/index.ts'],
  outdir: './dist',
  target: 'node',
  format: 'esm',
  sourcemap: 'external',
  minify: false,
  splitting: false
});

// Generate TypeScript declarations using native tsc
const proc = Bun.spawn(['bun', '--bun', 'tsc', '--emitDeclarationOnly', '--outDir', 'dist'], {
  cwd: process.cwd(),
  stdio: ['ignore', 'pipe', 'pipe']
});

await proc.exited;

console.log('✅ Built @cinderlink/server');