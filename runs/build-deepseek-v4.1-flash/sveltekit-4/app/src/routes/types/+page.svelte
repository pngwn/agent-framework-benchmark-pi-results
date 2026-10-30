<script>
	let { data } = $props();
</script>

<svelte:head>
	<title>{data.title}</title>
</svelte:head>

<h1 class="page-title">Types</h1>

<ul class="type-grid">
	{#each data.types as type (type.name)}
		<li>
			<a class={`type-tile type-${type.name}`} href={`/types/${type.name}`}>{type.englishName}</a>
		</li>
	{/each}
</ul>
