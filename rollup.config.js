import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import typescript from 'rollup-plugin-typescript2';
import globals from 'rollup-plugin-node-globals';
import builtins from 'rollup-plugin-node-builtins';
import { obfuscator } from 'rollup-obfuscator';

const production = !process.env.ROLLUP_WATCH;

export default [
  {
    input: ['./src/NextFederationPlugin.js'],
    output: {
      dir: 'lib',
      format: 'cjs',
      preserveModules: true,
      exports: 'auto',
    },
    external: [
      'fs',
      'path',
      'webpack',
      'crypto',
      'next',
      /node_modules/,
      /loaders/,
    ], // tells Rollup 'I know what I'm doing here'
    plugins: [
      nodeResolve({ preferBuiltins: true }), // or `true`
      commonjs(),
      // multi(),
      globals({
        dirname: false,
        filename: false,
      }),
      builtins(),
      obfuscator(),
    ],
  },
  {
    input: ['./src/mf-router/index.ts'],
    output: {
      dir: 'lib',
      format: 'cjs',
      preserveModules: true,
      exports: 'auto',
      sourcemap: !production,
    },
    external: ['next/dist/client/router'],
    plugins: [
      typescript({
        outDir: 'lib',
        sourceMap: !production,
        inlineSources: !production,
      }),
      commonjs(),
    ],
  },
];
