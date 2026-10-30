import { gracile } from '@gracile/gracile/plugin';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [gracile({ output: 'server', trailingSlash: 'ignore' })],
  build: { target: 'esnext' },
});
