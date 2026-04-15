import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    sourcemap: true,
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'mosp',
      formats: ['umd'],
      fileName: () => 'mosp.js',
    },
    outDir: 'dist',
  },
});
