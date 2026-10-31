import { createQwikCity } from '@builder.io/qwik-city/middleware/node';
import qwikCityPlan from '@qwik-city-plan';
import { manifest } from '@qwik-client-manifest';
import { createServer } from 'node:http';
import render from './entry.ssr';

const { router, notFound, staticFile } = createQwikCity({
  render,
  qwikCityPlan,
  manifest,
  static: {
    cacheControl: 'public, max-age=31536000, immutable',
  },
});

const server = createServer((req, res) => {
  staticFile(req, res, () => {
    router(req, res, () => {
      notFound(req, res, () => {
        res.end();
      });
    });
  });
});

const port = Number(process.env.PORT ?? 3000);
server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Pokedex app listening on http://localhost:${port}/`);
});
