const { defineConfig } = require('vite');
const react = require('@vitejs/plugin-react');
const tailwindcss = require('@tailwindcss/vite');
const path = require('path');

module.exports = defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: true,
    watch: { usePolling: true },
    hmr: false,
  },
  optimizeDeps: {
    force: true,
  },
});
