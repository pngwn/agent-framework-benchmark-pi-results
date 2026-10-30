<script>
	import TypeBadge from '#lib/components/TypeBadge.svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>Types – Pokédex</title>
</svelte:head>

<h1 class="page-heading">Types</h1>

<ul class="type-tiles">
	{#each data.types as type}
		<li><TypeBadge name={type.name} englishName={type.englishName} link tile /></li>
	{/each}
</ul>

<style>
	.type-tiles {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(8rem, 1fr));
		gap: var(--space-3);
	}

	.type-tiles :global(.type-badge) {
		width: 100%;
	}
</style>
