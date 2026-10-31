import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
// The app is a public-facing site (a reverse proxy handles TLS in production),
// so any Host header is acceptable.
const angularApp = new AngularNodeAppEngine({ allowedHosts: ['*'] });

const apiBaseUrl = (process.env['API_BASE_URL'] || 'http://localhost:9000').replace(/\/+$/, '');

/**
 * Runtime configuration for the browser: the origin of the PokeAPI server.
 * Loaded by a blocking script tag in index.html, before the app boots.
 */
app.get('/config.js', (req, res) => {
  res
    .type('application/javascript')
    .set('Cache-Control', 'no-cache')
    .send(`window.__API_BASE_URL__ = ${JSON.stringify(apiBaseUrl)};\n`);
});

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) => (response ? writeResponseToNodeResponse(response, res) : next()))
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 3000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 3000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
