import { MetaProvider, Title } from "@solidjs/meta";
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
          <Title>Pokédex</Title>
          <header class="site-header">
            <div class="container header-inner">
              <A href="/" class="brand">Pokédex</A>
              <nav class="site-nav" aria-label="Main">
                <A href="/">Pokémon</A>
                <A href="/types">Types</A>
              </nav>
            </div>
          </header>
          <Suspense fallback={<div class="container loading">Loading…</div>}>
            {props.children}
          </Suspense>
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
