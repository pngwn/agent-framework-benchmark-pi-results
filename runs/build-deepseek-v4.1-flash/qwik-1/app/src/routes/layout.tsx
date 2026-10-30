import { component$, Slot } from '@builder.io/qwik';

export default component$(() => {
  return (
    <div class="site-shell">
      <header class="site-header">
        <div class="site-header-inner">
          <a class="site-brand" href="/">
            Pokédex
          </a>
          <nav class="site-nav" aria-label="Main">
            <a href="/">Pokémon</a>
            <a href="/types">Types</a>
          </nav>
        </div>
      </header>

      <main>
        <div class="page-content">
          <Slot />
        </div>
      </main>

      <footer class="site-footer">
        <p>
          Data from PokéAPI. Pokémon and Pokémon character names are trademarks of Nintendo.
        </p>
      </footer>
    </div>
  );
});
