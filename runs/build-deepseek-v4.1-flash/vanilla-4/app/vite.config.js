import { defineConfig } from 'vite';

export default defineConfig({
  define: {
    __API_BASE_URL__: JSON.stringify(process.env.API_BASE_URL || 'http://localhost:9000'),
  },
  build: {
    target: 'esnext',
  },
});
