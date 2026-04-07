import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import path from 'path';

const host = process.env.TAURI_DEV_HOST;

export default defineConfig({
  plugins: [react(), tailwindcss(), autoprefixer()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host ? { protocol: 'ws', host, port: 1421 } : undefined,
    watch: { ignored: ['**/src-tauri/**'] },
  },
  build: {
    target: 'esnext',
    sourcemap: false,
    minify: 'esbuild',
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        assetFileNames: 'assets/[name]-[hash][extname]',
        chunkFileNames: 'js/[name]-[hash].js',
        entryFileNames: 'js/[name]-[hash].js',
        manualChunks: (id) => {
          if (id.includes('node_modules/react')) return 'vendor-react';
          if (id.includes('node_modules/react-router')) return 'vendor-router';
          if (id.includes('node_modules/@radix-ui')) return 'vendor-radix';
          if (id.includes('node_modules/@dnd-kit')) return 'vendor-dnd';
          if (id.includes('node_modules/zustand')) return 'vendor-state';
          if (id.includes('node_modules/sonner')) return 'vendor-sonner';
          if (id.includes('node_modules/cmdk')) return 'vendor-cmdk';
          if (id.includes('node_modules/dayjs') || id.includes('node_modules/fuse.js') ||
              id.includes('node_modules/highlight.js') || id.includes('node_modules/uuid') ||
              id.includes('node_modules/clsx') || id.includes('node_modules/class-variance-authority')) {
            return 'vendor-utils';
          }
          if (id.includes('node_modules/@tauri-apps')) return 'vendor-tauri';
        },
      },
    },
  },
});
