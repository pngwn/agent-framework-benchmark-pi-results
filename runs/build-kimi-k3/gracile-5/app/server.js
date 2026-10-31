import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import * as gracile from '@gracile/gracile/hono';
import { handler } from './dist/server/entrypoint.js';

const app = new Hono();
app.get('*', serveStatic({ root: gracile.getClientBuildPath(import.meta.url) }));
app.use(gracile.honoAdapter(handler));

const port = Number(process.env.PORT ?? 3000);
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Listening on http://localhost:${info.port}`);
});
