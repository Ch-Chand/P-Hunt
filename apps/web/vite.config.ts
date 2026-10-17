import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: process.env.VITE_BASE_PATH || '/',
  build: { target: 'es2022', rollupOptions: {output: {manualChunks: {react: ['react', 'react-dom', 'react-router-dom']}}} },
});
