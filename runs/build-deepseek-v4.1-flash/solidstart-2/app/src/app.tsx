import { MetaProvider } from "@solidjs/meta";
import { A, Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { Suspense } from "solid-js";
import "~/styles/tokens.css";
import "~/styles/app.css";

export default function App() {
  return (
    <Router
      root={(props) => (
        <MetaProvider>
          <header class="site-header">
            <div class="container header-inner">
              <A class="brand" href="/">
                Pokédex
              </A>
              <nav class="site-nav" aria-label="Main navigation">
                <A href="/">Pokémon</A>
                <A href="/types">Types</A>
              </nav>
            </div>
          </header>
          <Suspense>{props.children}</Suspense>
          <footer class="site-footer">
            <p>
              Data from PokéAPI. Pokémon and Pokémon character names are trademarks
              of Nintendo.
            </p>
          </footer>
        </MetaProvider>
      )}
    >
      <FileRoutes />
    </Router>
  );
}
