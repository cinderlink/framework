// Build single-file executable for CLI distribution
await Bun.build({
  entrypoints: ['./src/bin.ts'],
  outfile: './dist/cinderlink',
  target: 'bun',
  format: 'cjs', // Required for bytecode
  sourcemap: 'external',
  minify: true,
  compile: true,
  // Enable bytecode for faster startup
  bytecode: true
});

console.log('✅ Built @cinderlink/server-bin executable');