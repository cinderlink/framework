import { dts } from 'bun-dts';

await Bun.build({
  entrypoints: ['./src/index.ts'],
  outdir: './dist',
  target: 'browser',
  format: 'esm',
  sourcemap: 'external',
  minify: false,
  splitting: false,
  plugins: [dts()]
});

console.log('✅ Built @cinderlink/plugin-sync-db');