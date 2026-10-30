<script>
	import '../app.css';
	let { children } = $props();
</script>

<header class="site-header">
	<div class="shell">
		<a class="brand" href="/">Pokédex</a>
		<nav class="site-nav" aria-label="Primary">
			<a href="/">Pokémon</a>
			<a href="/types">Types</a>
		</nav>
	</div>
</header>

<main class="site-main">
	<div class="shell">
		{@render children()}
	</div>
</main>

<footer class="site-footer">
	Data from PokéAPI. Pokémon and Pokémon character names are trademarks of Nintendo.
</footer>
