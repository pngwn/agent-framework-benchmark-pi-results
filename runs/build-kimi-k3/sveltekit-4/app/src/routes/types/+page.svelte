<script>
	let { data } = $props();
</script>

<svelte:head>
	<title>Types – Pokédex</title>
</svelte:head>

<h1>Types</h1>

<ul class="type-grid">
	{#each data.types as type (type.name)}
		<li>
			<a class="type-tile" style:--pill-bg="var(--type-{type.name}, var(--color-border))" href="/types/{type.name}">
				{type.label}
			</a>
		</li>
	{/each}
</ul>

<style>
	.type-grid {
		list-style: none;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(8rem, 1fr));
		gap: var(--space-3);
	}

	.type-tile {
		display: block;
		padding: var(--space-3);
		border-radius: var(--radius-md);
		background: var(--pill-bg);
		color: var(--color-on-type);
		text-align: center;
		font-weight: var(--weight-semibold);
	}

	.type-tile:hover {
		text-decoration: none;
		filter: brightness(1.08);
	}
</style>
