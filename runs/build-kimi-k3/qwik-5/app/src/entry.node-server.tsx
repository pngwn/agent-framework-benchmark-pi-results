import { createQwikCity } from '@builder.io/qwik-city/middleware/node';
import qwikCityPlan from '@qwik-city-plan';
import { createServer } from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import render from './entry.ssr';

const distDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');

const { router, notFound, staticFile } = createQwikCity({
  render,
  qwikCityPlan,
  static: {
    root: distDir,
    cacheControl: 'public, max-age=31536000, immutable',
  },
});

const port = Number(process.env.PORT ?? 3000);

const server = createServer((req, res) => {
  staticFile(req, res, () => {
    router(req, res, () => {
      notFound(req, res, () => {
        res.statusCode = 404;
        res.end('Not Found');
      });
    });
  });
});

server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on http://localhost:${port}/`);
});
