import { A } from "@solidjs/router";

export default function Header() {
  return (
    <header class="banner">
      <div class="banner-inner">
        <A href="/" class="brand" end>
          Pokédex
        </A>
        <nav class="main-nav" aria-label="Main">
          <A href="/" end>
            Pokémon
          </A>
          <A href="/types">Types</A>
        </nav>
      </div>
    </header>
  );
}
