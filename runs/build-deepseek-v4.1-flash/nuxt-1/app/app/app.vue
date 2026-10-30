<template>
  <div class="site">
    <header class="site-header" role="banner">
      <div class="container site-header__inner">
        <NuxtLink class="site-brand" to="/">Pokédex</NuxtLink>
        <nav class="site-nav" aria-label="Primary">
          <NuxtLink to="/">Pokémon</NuxtLink>
          <NuxtLink to="/types">Types</NuxtLink>
        </nav>
      </div>
    </header>

    <main class="site-main">
      <div class="container">
        <NuxtPage />
      </div>
    </main>

    <footer class="site-footer" role="contentinfo">
      <div class="container">
        Data from PokéAPI. Pokémon and Pokémon character names are trademarks of Nintendo.
      </div>
    </footer>
  </div>
</template>
