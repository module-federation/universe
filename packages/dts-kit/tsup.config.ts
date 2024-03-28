import { join } from 'path';
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: join(__dirname, 'src/index.ts'),
    forkGenerateDts: join(__dirname, 'src/lib/forkGenerateDts.ts'),
  },
  dts: true,
  splitting: true,
  clean: true,
  format: ['cjs', 'esm'],
  outDir: 'packages/dts-kit/dist',
  external: [join(__dirname, 'package.json')],
});
