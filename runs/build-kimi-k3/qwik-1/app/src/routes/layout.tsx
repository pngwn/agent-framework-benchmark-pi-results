import { component$, Slot } from '@builder.io/qwik';

export default component$(() => {
  return (
    <>
      <header class="site-header">
        <div class="site-header-inner container">
          <a class="brand" href="/">
            Pokédex
          </a>
          <nav class="site-nav">
            <a href="/">Pokémon</a>
            <a href="/types">Types</a>
          </nav>
        </div>
      </header>
      <main class="container">
        <Slot />
      </main>
      <footer class="site-footer">
        <p>Data from PokéAPI. Pokémon and Pokémon character names are trademarks of Nintendo.</p>
      </footer>
    </>
  );
});
