<script>
	import '#lib/tokens.css';
	import '#lib/app.css';
	import favicon from '#lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<header class="site-header">
	<div class="container header-inner">
		<a class="brand" href="/">Pokédex</a>
		<nav class="site-nav" aria-label="Main">
			<a href="/">Pokémon</a>
			<a href="/types">Types</a>
		</nav>
	</div>
</header>

<main class="site-main">
	<div class="container">
		{@render children()}
	</div>
</main>

<footer class="site-footer">
	<div class="container">
		Data from PokéAPI. Pokémon and Pokémon character names are trademarks of Nintendo.
	</div>
</footer>

<style>
	.site-header {
		height: var(--header-height);
		background: var(--color-accent);
		color: var(--color-on-accent);
	}

	.header-inner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		height: 100%;
	}

	.brand {
		color: var(--color-on-accent);
		font-size: var(--text-lg);
		font-weight: var(--weight-semibold);
		text-decoration: none;
	}

	.site-nav {
		display: flex;
		align-items: center;
		gap: var(--space-5);
	}

	.site-nav a {
		color: var(--color-on-accent);
		font-size: var(--text-base);
		text-decoration: none;
	}

	.site-footer {
		border-top: 1px solid var(--color-border);
		padding-block: var(--space-5);
		color: var(--color-text-muted);
		font-size: var(--text-sm);
		text-align: center;
	}

	@media (max-width: 30rem) {
		.site-nav {
			gap: var(--space-4);
		}
	}
</style>
