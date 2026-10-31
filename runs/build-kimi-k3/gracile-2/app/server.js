import express from 'express';

import * as gracile from '@gracile/gracile/node';

import { handler } from './dist/server/entrypoint.js';

const app = express();

app.use(express.static(gracile.getClientBuildPath(import.meta.url)));

app.use(gracile.nodeAdapter(handler));

const port = Number(process.env.PORT ?? 3000);

export const server = app.listen(port, () =>
	gracile.printUrls(server.address()),
);
