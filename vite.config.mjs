import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    sourcemap: true,
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'msp',
      formats: ['umd'],
      fileName: () => 'msp.js',
    },
    outDir: 'dist',
  },
});
