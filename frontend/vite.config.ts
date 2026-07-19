import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Forward /api/* to the Express backend so the browser talks to one
    // origin in dev — no CORS involved.
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
});
