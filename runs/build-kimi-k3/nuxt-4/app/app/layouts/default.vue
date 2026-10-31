<template>
  <div class="app">
    <header class="site-header">
      <div class="container site-header-inner">
        <NuxtLink to="/" class="brand">Pokédex</NuxtLink>
        <nav aria-label="Main" class="site-nav">
          <NuxtLink to="/">Pokémon</NuxtLink>
          <NuxtLink to="/types">Types</NuxtLink>
        </nav>
      </div>
    </header>
    <main class="container site-main">
      <slot />
    </main>
    <footer class="site-footer">
      <div class="container">
        <p>Data from PokéAPI. Pokémon and Pokémon character names are trademarks of Nintendo.</p>
      </div>
    </footer>
  </div>
</template>
