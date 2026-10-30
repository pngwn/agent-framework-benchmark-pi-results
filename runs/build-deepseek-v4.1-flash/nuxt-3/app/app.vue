<template>
  <div class="app-shell">
    <header class="site-header">
      <div class="header-inner">
        <NuxtLink to="/" class="brand">Pokédex</NuxtLink>
        <nav class="site-nav" aria-label="Main">
          <NuxtLink to="/">Pokémon</NuxtLink>
          <NuxtLink to="/types">Types</NuxtLink>
        </nav>
      </div>
    </header>

    <main class="site-main">
      <NuxtPage />
    </main>

    <footer class="site-footer">
      <p>Data from PokéAPI. Pokémon and Pokémon character names are trademarks of Nintendo.</p>
    </footer>
  </div>
</template>
