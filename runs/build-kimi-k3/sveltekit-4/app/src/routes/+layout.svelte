<script>
	import '../app.css';

	let { children } = $props();
</script>

<header class="site-header">
	<div class="wrap">
		<a class="brand" href="/">Pokédex</a>
		<nav class="site-nav" aria-label="Main">
			<a href="/">Pokémon</a>
			<a href="/types">Types</a>
		</nav>
	</div>
</header>

<main class="wrap">
	{@render children()}
</main>

<footer class="site-footer">
	<p>Data from PokéAPI. Pokémon and Pokémon character names are trademarks of Nintendo.</p>
</footer>
