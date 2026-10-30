<template>
  <div class="site">
    <header class="banner">
      <div class="header-inner">
        <NuxtLink to="/" class="brand">Pokédex</NuxtLink>
        <nav class="site-nav" aria-label="Main">
          <NuxtLink to="/">Pokémon</NuxtLink>
          <NuxtLink to="/types">Types</NuxtLink>
        </nav>
      </div>
    </header>

    <main class="site-main">
      <slot />
    </main>

    <footer class="site-footer">
      <div class="footer-inner">
        Data from PokéAPI. Pokémon and Pokémon character names are trademarks of
        Nintendo.
      </div>
    </footer>
  </div>
</template>
