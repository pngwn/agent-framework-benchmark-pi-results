import express from 'express';
import * as gracile from '@gracile/gracile/node';

import { handler } from './dist/server/entrypoint.js';

const app = express();

app.use(express.static(gracile.getClientBuildPath(import.meta.url)));

app.use((req, res, next) => {
  res.locals.requestId = crypto.randomUUID();
  return next();
});

app.use(gracile.nodeAdapter(handler));

const port = Number(process.env.PORT ?? 3000);

const server = app.listen(port, () => {
  console.log(`Pokédex listening on http://localhost:${port}`);
});

export { server };
