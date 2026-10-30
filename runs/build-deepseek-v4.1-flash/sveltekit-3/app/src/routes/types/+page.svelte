<script>
	let { data } = $props();
</script>

<svelte:head>
	<title>Types – Pokédex</title>
</svelte:head>

<h1>Types</h1>

<ul class="type-grid" aria-label="Pokémon types">
	{#each data.types as type (type.name)}
		<li>
			<a class="type-tile type-{type.name}" href="/types/{type.name}">{type.label}</a>
		</li>
	{/each}
</ul>
