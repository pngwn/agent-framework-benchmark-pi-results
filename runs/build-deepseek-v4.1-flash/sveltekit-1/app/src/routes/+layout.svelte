<script>
  import '../app.css';

  let { children } = $props();
</script>

<header class="banner">
  <div class="container banner-inner">
    <a class="brand" href="/">Pokédex</a>
    <nav class="main-nav" aria-label="Main">
      <a href="/">Pokémon</a>
      <a href="/types">Types</a>
    </nav>
  </div>
</header>

<main class="container page-main">
  {@render children()}
</main>

<footer class="contentinfo">
  <div class="container">
    <p>Data from PokéAPI. Pokémon and Pokémon character names are trademarks of Nintendo.</p>
  </div>
</footer>
