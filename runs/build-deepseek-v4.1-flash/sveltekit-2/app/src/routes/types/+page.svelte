<script>
	let { data } = $props();
</script>

<svelte:head>
	<title>Types – Pokédex</title>
</svelte:head>

<h1>Types</h1>

<ul class="type-list">
	{#each data.types as type}
		<li><a class="type-link type-{type.name}" href={`/types/${type.name}`}>{type.label}</a></li>
	{/each}
</ul>

<style>
	.type-list {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(8rem, 1fr));
		gap: var(--space-3);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.type-link {
		display: block;
		padding: var(--space-2) var(--space-3);
		background: var(--type-color);
		border-radius: var(--radius-sm);
		color: var(--color-on-type);
		font-size: var(--text-base);
		text-align: center;
		text-decoration: none;
	}
</style>
