import { defineConfig } from 'vite';

// Serve the runtime API config in dev too (server.mjs does it in production).
export default defineConfig({
  plugins: [
    {
      name: 'api-config',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url === '/config.js') {
            const base = (process.env.API_BASE_URL ?? 'http://localhost:9000').replace(/\/+$/, '');
            res.setHeader('Content-Type', 'text/javascript; charset=utf-8');
            res.end(`window.__API_BASE_URL__ = ${JSON.stringify(base)};`);
            return;
          }
          next();
        });
      },
    },
  ],
});
