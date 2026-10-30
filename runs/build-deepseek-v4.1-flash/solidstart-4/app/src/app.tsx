import { MetaProvider } from "@solidjs/meta";
import { A, Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { Suspense } from "solid-js";
import "./tokens.css";
import "./app.css";

export default function App() {
  return (
    <Router
      root={(props) => (
        <MetaProvider>
          <div class="app-shell">
            <header class="site-header">
              <div class="header-inner">
                <A class="brand" href="/">
                  Pokédex
                </A>
                <nav class="site-nav" aria-label="Main">
                  <A href="/">Pokémon</A>
                  <A href="/types">Types</A>
                </nav>
              </div>
            </header>
            <main class="site-main">
              <Suspense fallback={<p class="loading">Loading…</p>}>{props.children}</Suspense>
            </main>
            <footer class="site-footer">
              Data from PokéAPI. Pokémon and Pokémon character names are trademarks of Nintendo.
            </footer>
          </div>
        </MetaProvider>
      )}
    >
      <FileRoutes />
    </Router>
  );
}
