import { readFileSync } from 'node:fs';
import { defineConfig } from 'tsup';

const { version } = JSON.parse(readFileSync('./package.json', 'utf-8')) as { version: string };

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
    define: { 'process.env.npm_package_version': JSON.stringify(version) },
  },
]);
