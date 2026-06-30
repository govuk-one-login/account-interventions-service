import typescript from '@rollup/plugin-typescript';
import dts from 'rollup-plugin-dts';
import { defineConfig, type RollupOptions } from 'rollup';

const input = 'src/index.ts';

const jsTs = (outDir: string) =>
  typescript({
    tsconfig: './tsconfig.json',
    outDir,
    declaration: false,
    declarationMap: false,
  });

const config: RollupOptions[] = [
  {
    input,
    external: ['zod'],
    output: { file: 'dist/index.cjs', format: 'cjs' },
    plugins: [jsTs('dist')],
  },
  {
    input,
    external: ['zod'],
    output: { file: 'dist/index.js', format: 'es' },
    plugins: [jsTs('dist')],
  },
  {
    input,
    output: { file: 'dist/index.d.ts', format: 'es' },
    plugins: [dts({ tsconfig: './tsconfig.json' })],
  },
];

export default defineConfig(config);
