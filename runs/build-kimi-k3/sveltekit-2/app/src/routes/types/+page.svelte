<script>
  let { data } = $props();
</script>

<svelte:head>
  <title>Types – Pokédex</title>
</svelte:head>

<h1>Types</h1>

<ul class="type-grid">
  {#each data.types as type (type.name)}
    <li><a class="type-{type.name}" href="/types/{type.name}">{type.en}</a></li>
  {/each}
</ul>
