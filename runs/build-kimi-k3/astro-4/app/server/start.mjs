// Production entrypoint: serve the built SSR server on $PORT (default 3000).
process.env.PORT ??= '3000';
process.env.HOST ??= '0.0.0.0';
await import('../dist/server/entry.mjs');
