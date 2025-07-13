import { dts } from 'bun-dts';

await Bun.build({
  entrypoints: ['./src/index.ts'],
  outdir: './dist',
  target: 'node', // Server uses Node.js APIs
  format: 'esm',
  sourcemap: 'external',
  minify: false,
  splitting: false,
  plugins: [dts()]
});

console.log('✅ Built @cinderlink/server');