<script>
	let { data } = $props();
</script>

<svelte:head>
	<title>Types – Pokédex</title>
</svelte:head>

<h1>Types</h1>

<ul class="type-list">
	{#each data.types as t (t.name)}
		<li><a class="type-{t.name}" href="/types/{t.name}">{t.en}</a></li>
	{/each}
</ul>
