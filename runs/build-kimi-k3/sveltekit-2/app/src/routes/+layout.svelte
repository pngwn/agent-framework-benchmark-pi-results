<script>
  import { onMount, tick } from 'svelte';

  let { children } = $props();

  onMount(async () => {
    await tick();
    window.__pokedexHydrationDone?.();
  });
</script>

<header class="site-header">
  <div class="site-header-inner">
    <a class="brand" href="/">Pokédex</a>
    <nav aria-label="Main">
      <a href="/">Pokémon</a>
      <a href="/types">Types</a>
    </nav>
  </div>
</header>

<main>
  {@render children()}
</main>

<footer class="site-footer">
  <p>Data from PokéAPI. Pokémon and Pokémon character names are trademarks of Nintendo.</p>
</footer>
