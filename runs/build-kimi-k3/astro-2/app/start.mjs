// Production entrypoint. Binds an address reachable as both `localhost` and
// 127.0.0.1; the port comes from $PORT (default 3000).
process.env.HOST ??= '0.0.0.0';
process.env.PORT ??= '3000';
await import('./dist/server/entry.mjs');
