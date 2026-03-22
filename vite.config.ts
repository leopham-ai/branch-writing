import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'path';

export default defineConfig({
  plugins: [svelte()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/main.ts'),
      name: 'BranchWriting',
      formats: ['cjs'],
      fileName: () => 'main.js',
    },
    rollupOptions: {
      external: ['obsidian', 'fs', 'path', 'crypto'],
      output: {
        globals: {
          obsidian: 'obsidian',
        },
        assetFileNames: 'styles.css',
      },
    },
    outDir: 'dist',
    emptyOutDir: true,
  },
});
