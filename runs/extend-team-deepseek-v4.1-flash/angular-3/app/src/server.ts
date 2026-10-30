import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';
import { loadPageData } from './server/loaders';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
// The app runs behind a reverse proxy whose public host isn't known here. Rendering never
// makes requests derived from the Host header (all data comes from API_BASE_URL), so the
// SSRF protection that allowedHosts provides isn't needed.
const angularApp = new AngularNodeAppEngine({ allowedHosts: ['*'] });

/**
 * Page data for client-side navigation: the same view models the server renders with.
 */
app.get('/_data/{*path}', (req, res, next) => {
  loadPageData(req.url.slice('/_data'.length))
    .then((data) => {
      res.setHeader('Cache-Control', 'no-cache');
      res.status(data === null ? 404 : 200).json(data);
    })
    .catch(next);
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
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
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
