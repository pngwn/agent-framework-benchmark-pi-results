import { component$, Slot } from "@builder.io/qwik";
import { Link } from "@builder.io/qwik-city";
import { POKEMON_ENHANCEMENT_SCRIPT } from "../lib/pokemon-enhance";

export default component$(() => {
  return (
    <>
      <header className="site-header">
        <div className="header-inner">
          <Link className="brand" href="/">
            Pokédex
          </Link>
          <nav className="site-nav" aria-label="Main">
            <Link href="/">Pokémon</Link>
            <Link href="/types">Types</Link>
          </nav>
        </div>
      </header>
      <main className="page">
        <Slot />
      </main>
      <footer className="site-footer">
        <p>
          Data from PokéAPI. Pokémon and Pokémon character names are
          trademarks of Nintendo.
        </p>
      </footer>
      <script dangerouslySetInnerHTML={POKEMON_ENHANCEMENT_SCRIPT} />
    </>
  );
});
