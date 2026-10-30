<template>
  <div class="app-shell">
    <header class="site-header">
      <div class="site-header__inner">
        <NuxtLink to="/" class="site-brand">Pokédex</NuxtLink>
        <nav class="site-nav" aria-label="Primary">
          <NuxtLink to="/">Pokémon</NuxtLink>
          <NuxtLink to="/types">Types</NuxtLink>
        </nav>
      </div>
    </header>

    <main class="page-main">
      <slot />
    </main>

    <footer class="site-footer">
      <p>Data from PokéAPI. Pokémon and Pokémon character names are trademarks of Nintendo.</p>
    </footer>
  </div>
</template>
