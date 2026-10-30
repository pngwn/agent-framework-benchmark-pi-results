<script lang="ts">
	import '#lib/tokens.css';
	import '../app.css';
	import favicon from '#lib/assets/favicon.svg';
	import { setTeam, TeamState } from '#lib/team.svelte.ts';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	// The initial server data seeds the browser-owned team; later changes update the store directly.
	// svelte-ignore state_referenced_locally
	const team = new TeamState(data.team);
	setTeam(team);
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<header class="site-header">
	<div class="inner">
		<a class="brand" href="/">Pokédex</a>
		<nav aria-label="Main">
			<ul>
				<li><a href="/">Pokémon</a></li>
				<li><a href="/types">Types</a></li>
				<li><a href="/team">Team</a></li>
			</ul>
		</nav>
	</div>
</header>

<main>
	{@render children()}
</main>

<footer class="site-footer">
	<p>Data from PokéAPI. Pokémon and Pokémon character names are trademarks of Nintendo.</p>
</footer>

<style>
	.site-header {
		background: var(--color-accent);
		color: var(--color-on-accent);
	}

	.inner {
		max-width: var(--content-max-width);
		height: var(--header-height);
		margin: 0 auto;
		padding: 0 var(--space-4);
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-4);
	}

	.site-header a {
		color: inherit;
		text-decoration: none;
	}

	.site-header a:hover {
		text-decoration: underline;
	}

	.brand {
		font-size: var(--text-lg);
	}

	nav ul {
		display: flex;
		gap: var(--space-5);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	main {
		flex: 1;
		width: 100%;
		max-width: var(--content-max-width);
		margin: 0 auto;
		padding: var(--space-5) var(--space-4) var(--space-7);
	}

	.site-footer {
		border-top: 1px solid var(--color-border);
		padding: var(--space-5) var(--space-4);
		text-align: center;
		color: var(--color-text-muted);
		font-size: var(--text-sm);
	}
</style>
