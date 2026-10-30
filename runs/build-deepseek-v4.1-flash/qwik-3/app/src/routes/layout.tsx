import { component$, Slot } from '@builder.io/qwik';

export default component$(() => {
  return (
    <>
      <header class="site-header">
        <div class="site-header__inner">
          <a class="brand" href="/">Pokédex</a>
          <nav class="site-nav" aria-label="Main navigation">
            <a href="/">Pokémon</a>
            <a href="/types">Types</a>
          </nav>
        </div>
      </header>

      <main class="page">
        <Slot />
      </main>

      <footer class="site-footer">
        Data from PokéAPI. Pokémon and Pokémon character names are trademarks of Nintendo.
      </footer>
    </>
  );
});
