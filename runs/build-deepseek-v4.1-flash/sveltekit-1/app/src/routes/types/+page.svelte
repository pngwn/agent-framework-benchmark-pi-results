<script>
  let { data } = $props();
</script>

<svelte:head>
  <title>Types – Pokédex</title>
</svelte:head>

<h1>Types</h1>

<ul class="type-grid">
  {#each data.types as type}
    <li>
      <a class="type-pill type-{type.name}" href={`/types/${type.name}`}>{type.label}</a>
    </li>
  {/each}
</ul>
