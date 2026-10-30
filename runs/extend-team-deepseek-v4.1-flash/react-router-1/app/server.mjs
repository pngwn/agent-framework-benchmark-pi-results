// Production server: static assets from build/client, everything else through React Router.
// Compression, HTTPS and HTTP/2 are left to the reverse proxy in front of this server.
import express from "express";
import { createRequestHandler } from "@react-router/express";

const PORT = Number(process.env.PORT ?? 3000);

const app = express();
app.disable("x-powered-by");
app.use("/assets", express.static("build/client/assets", { immutable: true, maxAge: "1y" }));
app.use(express.static("build/client", { maxAge: "1h", index: false }));
app.all(
  "/{*splat}",
  createRequestHandler({ build: await import("./build/server/index.js"), mode: process.env.NODE_ENV }),
);

app.listen(PORT, () => console.log(`Pokédex listening on http://localhost:${PORT}`));
