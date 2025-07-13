import { dts } from 'bun-dts';

await Bun.build({
  entrypoints: ['./src/index.ts'],
  outdir: './dist',
  target: 'browser',
  format: 'esm',
  sourcemap: 'external',
  minify: false,
  splitting: false, // Keep single file for simplicity
  plugins: [dts()]
});

console.log('✅ Built @cinderlink/identifiers');