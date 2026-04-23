import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: { index: 'src/index.ts' },
    format: ['esm', 'cjs', 'iife'],
    globalName: 'FeelRunner',
    dts: true,
    sourcemap: true,
    clean: true,
    minify: false,
    splitting: false,
    treeshake: true,
  },
  {
    entry: { 'bin/feel-runner': 'bin/feel-runner.ts' },
    format: ['esm'],
    dts: false,
    splitting: false,
    clean: false,
    sourcemap: false,
    banner: { js: '#!/usr/bin/env node' },
  },
]);
