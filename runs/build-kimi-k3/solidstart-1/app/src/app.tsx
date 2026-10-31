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
            <div class="container site-header-inner">
              <A href="/" class="brand">
                Pokédex
              </A>
              <nav class="site-nav">
                <A href="/">Pokémon</A>
                <A href="/types">Types</A>
              </nav>
            </div>
          </header>
          <main class="container">
            <Suspense>{props.children}</Suspense>
          </main>
          <footer class="site-footer">
            <p>Data from PokéAPI. Pokémon and Pokémon character names are trademarks of Nintendo.</p>
          </footer>
        </MetaProvider>
      )}
    >
      <FileRoutes />
    </Router>
  );
}
