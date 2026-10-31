<template>
  <div class="site">
    <header class="site-header">
      <div class="container site-header-inner">
        <NuxtLink to="/" class="site-logo">Pokédex</NuxtLink>
        <nav class="site-nav" aria-label="Main">
          <NuxtLink to="/">Pokémon</NuxtLink>
          <NuxtLink to="/types">Types</NuxtLink>
        </nav>
      </div>
    </header>
    <main class="container site-main">
      <NuxtPage />
    </main>
    <footer class="site-footer">
      <div class="container">
        <p>Data from PokéAPI. Pokémon and Pokémon character names are trademarks of Nintendo.</p>
      </div>
    </footer>
  </div>
</template>
