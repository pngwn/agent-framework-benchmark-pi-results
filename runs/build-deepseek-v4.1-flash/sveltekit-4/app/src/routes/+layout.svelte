<script>
	import '../app.css';
	import favicon from '#lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<header class="site-header">
	<div class="container banner-inner">
		<a class="brand" href="/">Pokédex</a>
		<nav class="site-nav" aria-label="Main">
			<a href="/">Pokémon</a>
			<a href="/types">Types</a>
		</nav>
	</div>
</header>

<main class="container">
	{@render children()}
</main>

<footer class="site-footer">
	Data from PokéAPI. Pokémon and Pokémon character names are trademarks of Nintendo.
</footer>
