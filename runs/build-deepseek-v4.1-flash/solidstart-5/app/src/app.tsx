import { MetaProvider } from "@solidjs/meta";
import { A, Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { Suspense } from "solid-js";
import "./app.css";

export default function App() {
  return (
    <MetaProvider>
      <Router
        root={props => (
          <div class="site">
            <header class="site-header">
              <A href="/" class="brand">
                Pokédex
              </A>
              <nav class="site-nav" aria-label="Main">
                <A href="/">Pokémon</A>
                <A href="/types">Types</A>
              </nav>
            </header>
            <Suspense>{props.children}</Suspense>
            <footer class="site-footer">
              Data from PokéAPI. Pokémon and Pokémon character names are trademarks of
              Nintendo.
            </footer>
          </div>
        )}
      >
        <FileRoutes />
      </Router>
    </MetaProvider>
  );
}
