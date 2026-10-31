import { component$, Slot } from '@builder.io/qwik';
import { Link } from '@builder.io/qwik-city';

export default component$(() => {
  return (
    <>
      <header class="site-header">
        <div class="wrap header-inner">
          <Link class="brand" href="/">
            Pokédex
          </Link>
          <nav>
            <Link href="/">Pokémon</Link>
            <Link href="/types">Types</Link>
          </nav>
        </div>
      </header>
      <main class="wrap">
        <Slot />
      </main>
      <footer class="site-footer">
        <p>Data from PokéAPI. Pokémon and Pokémon character names are trademarks of Nintendo.</p>
      </footer>
    </>
  );
});
