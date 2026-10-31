import { createQwikCity } from '@builder.io/qwik-city/middleware/node';
import qwikCityPlan from '@qwik-city-plan';
import { manifest } from '@qwik-client-manifest';
import render from './entry.ssr';
import { createServer } from 'node:http';

const { router, notFound, staticFile } = createQwikCity({
  render,
  qwikCityPlan,
  manifest,
});

const port = Number(process.env.PORT ?? 3000);

const server = createServer((req, res) => {
  staticFile(req, res, () => {
    router(req, res, () => {
      notFound(req, res, () => {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Not Found');
      });
    });
  });
});

server.listen(port, () => {
  console.log(`Pokédex server listening on http://localhost:${port}`);
});
