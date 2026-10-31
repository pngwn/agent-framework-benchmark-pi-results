import { createQwikCity, type PlatformNode } from '@builder.io/qwik-city/middleware/node';
import qwikCityPlan from '@qwik-city-plan';
import render from './entry.ssr';
import express from 'express';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

declare global {
  interface QwikCityPlatform extends PlatformNode {}
}

// Directories where the static assets are located.
const distDir = join(fileURLToPath(import.meta.url), '..', '..', 'dist');

// Create the Qwik City node middleware.
const { router, notFound } = createQwikCity({
  render,
  qwikCityPlan,
  static: {
    cacheControl: 'public, max-age=31557600',
  },
});

const app = express();

// Static assets (long-lived cache for hashed files).
app.use(
  '/build',
  express.static(join(distDir, 'build'), { immutable: true, maxAge: '1y', index: false }),
);
app.use(express.static(distDir, { index: false, redirect: false }));

// Qwik City pages and data endpoints.
app.use(router);
app.use(notFound);

const PORT = Number(process.env.PORT ?? 3000);
app.listen(PORT, () => {
  console.log(`Server started: http://localhost:${PORT}/`);
});
