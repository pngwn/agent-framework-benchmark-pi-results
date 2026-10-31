import { MetaProvider } from "@solidjs/meta";
import { A, Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { Suspense } from "solid-js";
import "./app.css";

function Header() {
  return (
    <header class="site-header">
      <div class="site-header-inner">
        <A href="/" class="brand">
          Pokédex
        </A>
        <nav class="site-nav" aria-label="Main">
          <A href="/">Pokémon</A>
          <A href="/types">Types</A>
        </nav>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer class="site-footer">
      <p>Data from PokéAPI. Pokémon and Pokémon character names are trademarks of Nintendo.</p>
    </footer>
  );
}

export default function App() {
  return (
    <Router
      root={(props) => (
        <MetaProvider>
          <Header />
          <Suspense>{props.children}</Suspense>
          <Footer />
        </MetaProvider>
      )}
    >
      <FileRoutes />
    </Router>
  );
}
