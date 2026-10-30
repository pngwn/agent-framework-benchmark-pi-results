<template>
  <header class="site-header">
    <div class="container site-header__inner">
      <NuxtLink to="/" class="site-header__home">Pokédex</NuxtLink>
      <nav aria-label="Main">
        <ul class="site-header__nav">
          <li><NuxtLink to="/">Pokémon</NuxtLink></li>
          <li><NuxtLink to="/types">Types</NuxtLink></li>
          <li><NuxtLink to="/team">Team</NuxtLink></li>
        </ul>
      </nav>
    </div>
  </header>
</template>
