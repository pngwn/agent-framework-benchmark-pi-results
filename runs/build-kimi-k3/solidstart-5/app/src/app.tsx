import { MetaProvider } from "@solidjs/meta";
import { A, Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { Suspense } from "solid-js";
import "./app.css";

export default function App() {
  return (
    <Router
      root={(props) => (
        <MetaProvider>
          <header class="site-header">
            <div class="container header-inner">
              <A href="/" class="brand">
                Pokédex
              </A>
              <nav class="site-nav" aria-label="Main">
                <A href="/" end>
                  Pokémon
                </A>
                <A href="/types">Types</A>
              </nav>
            </div>
          </header>
          <Suspense>{props.children}</Suspense>
          <footer class="site-footer">
            <div class="container">
              Data from PokéAPI. Pokémon and Pokémon character names are trademarks of Nintendo.
            </div>
          </footer>
        </MetaProvider>
      )}
    >
      <FileRoutes />
    </Router>
  );
}
