// Serve the production build. Port comes from $PORT (default 3000).
process.env.PORT ??= '3000';
await import('./dist/server/entry.mjs');
