<template>
  <div class="site-shell">
    <header class="site-header">
      <div class="container site-header__inner">
        <NuxtLink to="/" class="site-brand">Pokédex</NuxtLink>
        <nav class="site-nav" aria-label="Main">
          <NuxtLink to="/">Pokémon</NuxtLink>
          <NuxtLink to="/types">Types</NuxtLink>
        </nav>
      </div>
    </header>

    <main class="site-main">
      <div class="container">
        <slot />
      </div>
    </main>

    <footer class="site-footer">
      <div class="container">
        Data from PokéAPI. Pokémon and Pokémon character names are trademarks of Nintendo.
      </div>
    </footer>
  </div>
</template>
