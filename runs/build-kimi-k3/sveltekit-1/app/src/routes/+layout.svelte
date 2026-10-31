<script>
	import '../app.css';

	let { children } = $props();
</script>

<header class="site-header">
	<div class="container header-inner">
		<a class="brand" href="/">Pokédex</a>
		<nav aria-label="Main">
			<a href="/">Pokémon</a>
			<a href="/types">Types</a>
		</nav>
	</div>
</header>

<main class="container">
	{@render children()}
</main>

<footer class="site-footer">
	<div class="container">
		<p>Data from PokéAPI. Pokémon and Pokémon character names are trademarks of Nintendo.</p>
	</div>
</footer>
