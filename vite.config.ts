import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup/index.html'),
        background: resolve(__dirname, 'src/background/background.ts'),
        content: resolve(__dirname, 'src/content/content.ts'),
      },
      output: {
        entryFileNames: ({ name }) => {
          if (name === 'background') return 'background/background.js';
          if (name === 'content') return 'content/content.js';
          if (name === 'popup') return 'popup/popup.js';
          return '[name]/[name].js';
        },
        chunkFileNames: '[name]/[name].js',
        assetFileNames: '[name]/[name].[ext]',
      },
    },
    outDir: 'dist',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});