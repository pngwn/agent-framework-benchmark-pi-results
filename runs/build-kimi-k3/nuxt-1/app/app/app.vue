<script setup>
useHead({
  htmlAttrs: { lang: 'en' },
  title: 'Pokédex',
})
</script>

<template>
  <div>
    <header class="site-header">
      <div class="container header-inner">
        <NuxtLink to="/" class="brand">Pokédex</NuxtLink>
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
