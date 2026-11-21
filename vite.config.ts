import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    // Bind every interface (IPv4 + IPv6) so `localhost`, `127.0.0.1` and
    // LAN/Android URLs all reach the same dev server and its HMR WebSocket.
    host: true,
    port: 5173,
  },
  build: { outDir: 'dist' },
});
