// Serve the production build. The Astro Node standalone server reads
// HOST/PORT from the environment; provide the defaults required by the spec.
process.env.PORT = process.env.PORT || '3000';
process.env.HOST = process.env.HOST || '0.0.0.0';
await import('./dist/server/entry.mjs');
