import { component$, Slot } from "@builder.io/qwik";

export default component$(() => {
  return (
    <div class="site">
      <header class="banner">
        <div class="container banner-inner">
          <a class="brand" href="/">
            Pokédex
          </a>
          <nav class="main-nav" aria-label="Main">
            <a href="/">Pokémon</a>
            <a href="/types">Types</a>
          </nav>
        </div>
      </header>
      <main class="container">
        <Slot />
      </main>
      <footer class="contentinfo">
        <div class="container">
          Data from PokéAPI. Pokémon and Pokémon character names are trademarks of Nintendo.
        </div>
      </footer>
    </div>
  );
});
