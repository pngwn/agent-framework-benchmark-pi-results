// @refresh reload
import { createHandler, StartServer } from "@solidjs/start/server";

function apiBaseUrl() {
  return (process.env.API_BASE_URL ?? "http://localhost:9000").replace(/\/$/, "");
}

export default createHandler(() => (
  <StartServer
    document={({ assets, children, scripts }) => (
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <meta name="color-scheme" content="light" />
          <meta name="api-base" content={apiBaseUrl()} />
          {assets}
        </head>
        <body>
          <div id="app">{children}</div>
          {scripts}
        </body>
      </html>
    )}
  />
));
