import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  publicDir: 'public',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  server: {
    // host: '0.0.0.0', // 外部(同一LAN)からのアクセスを許可（IPv4で待受）
    port: 3000,
    strictPort: true,
    allowedHosts: true, // Vite 6.x: 全ホストからのアクセスを許可（ローカル開発用）
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:4000',
        ws: true,
      },
    },
  },
});
