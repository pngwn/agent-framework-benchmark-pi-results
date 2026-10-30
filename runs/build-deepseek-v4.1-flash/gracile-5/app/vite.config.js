import { defineConfig } from 'vite';
import { gracile } from '@gracile/gracile/plugin';

export default defineConfig({
  server: { port: 3000 },
  plugins: [gracile({ output: 'server' })],
  build: { target: 'esnext' },
});
