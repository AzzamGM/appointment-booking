import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: '/appointment-booking/',
  plugins: [react(), tailwindcss()],
  server: {
    // Listen on all interfaces so other devices on the LAN can open the app.
    host: true,
    // Forward /api/* to the Express backend so the browser talks to one
    // origin in dev — no CORS involved. Works for LAN devices too, since the
    // proxying happens server-side on this machine.
    proxy: {
      '/api': 'http://localhost:4000',
    },
    watch: {
      usePolling: true,
      interval: 300,
    },
  },
});
