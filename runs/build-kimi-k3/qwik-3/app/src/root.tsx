import { component$ } from "@builder.io/qwik";
import { QwikCityProvider, RouterOutlet } from "@builder.io/qwik-city";
import { RouterHead } from "./components/router-head/router-head";

import "./tokens.css";
import "./global.css";

export default component$(() => {
  return (
    <QwikCityProvider>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <RouterHead />
      </head>
      <body>
        <header class="site-header">
          <div class="wrap site-header-inner">
            <a class="brand" href="/">
              Pokédex
            </a>
            <nav class="site-nav" aria-label="Main">
              <a href="/">Pokémon</a>
              <a href="/types">Types</a>
            </nav>
          </div>
        </header>
        <main class="wrap site-main">
          <RouterOutlet />
        </main>
        <footer class="site-footer">
          <p>
            Data from PokéAPI. Pokémon and Pokémon character names are
            trademarks of Nintendo.
          </p>
        </footer>
      </body>
    </QwikCityProvider>
  );
});
