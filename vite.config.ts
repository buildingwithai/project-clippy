import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup/index.html'),
        overlay: resolve(__dirname, 'src/overlay/index.html'),
        options: resolve(__dirname, 'src/options/index.html'),
        background: resolve(__dirname, 'src/background/background.ts'),
        content: resolve(__dirname, 'src/content/content.ts'),
        'hotkey-listener': resolve(__dirname, 'src/content/hotkey-listener.ts'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          const { name } = chunkInfo;
          if (name === 'background') return 'background/background.js';
          if (name === 'content') return 'content/content.js';
          if (name === 'hotkey-listener') return 'content/hotkey-listener.js';
          if (name === 'popup') return 'popup/popup.js';
          if (name === 'overlay') return 'overlay/overlay.js';
          return '[name]/[name].js';
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
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