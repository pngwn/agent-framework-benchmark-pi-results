// Production server: serves the built client assets and hands everything else to the
// TanStack Start fetch handler. Compression/HTTPS are left to the reverse proxy.
import { serve } from 'srvx/node';
import { staticMiddleware } from 'srvx/static';
import { fileURLToPath } from 'node:url';
import handler from './dist/server/server.js';

serve({
  port: Number(process.env.PORT ?? 3000),
  middleware: [
    staticMiddleware({
      dir: fileURLToPath(new URL('./dist/client', import.meta.url)),
      compress: false,
      // Everything in dist/client is content-hashed by Vite.
      maxAge: 31536000,
      immutable: true,
    }),
  ],
  fetch: handler.fetch,
});
