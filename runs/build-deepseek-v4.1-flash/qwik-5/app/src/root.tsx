import { component$ } from "@builder.io/qwik";
import { Link, QwikCityProvider, RouterOutlet } from "@builder.io/qwik-city";
import { RouterHead } from "./components/router-head";
import "./global.css";

export default component$(() => {
  return (
    <QwikCityProvider viewTransition={false}>
      <head>
        <meta charset="utf-8" />
        <RouterHead />
      </head>
      <body lang="en">
        <header class="site-header">
          <div class="container header-inner">
            <Link href="/" class="brand">Pokédex</Link>
            <nav class="site-nav" aria-label="Main">
              <Link href="/">Pokémon</Link>
              <Link href="/types">Types</Link>
            </nav>
          </div>
        </header>
        <main class="container page-main">
          <RouterOutlet />
        </main>
        <footer class="site-footer">
          <div class="container">
            Data from PokéAPI. Pokémon and Pokémon character names are trademarks of Nintendo.
          </div>
        </footer>
      </body>
    </QwikCityProvider>
  );
});
