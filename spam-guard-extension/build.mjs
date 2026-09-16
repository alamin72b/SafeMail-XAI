import { cp, mkdir } from 'node:fs/promises';

import { build } from 'esbuild';

const outdir = 'dist';
await mkdir(
  outdir,
  { recursive: true },
);

const common = {
  bundle: true,
  minify: true,
  sourcemap: false,
  target: 'chrome120',
  logLevel: 'info',
};

await Promise.all([
  build({
    ...common,
    entryPoints: ['src/background/service-worker.ts'],
    outfile: `${outdir}/service-worker.js`,
    format: 'esm',
  }),
  build({
    ...common,
    entryPoints: ['src/content/content-script.ts'],
    outfile: `${outdir}/content-script.js`,
    format: 'iife',
  }),
  build({
    ...common,
    entryPoints: ['src/popup/popup.ts'],
    outfile: `${outdir}/popup.js`,
    format: 'iife',
  }),
  build({
    ...common,
    entryPoints: ['src/options/options.ts'],
    outfile: `${outdir}/options.js`,
    format: 'iife',
  }),
]);

await cp(
  'public',
  outdir,
  { recursive: true },
);
console.log('Build complete → dist/');
