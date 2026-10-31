<script>
  let { data } = $props();
</script>

<svelte:head>
  <title>Types – Pokédex</title>
</svelte:head>

<h1>Types</h1>

<ul class="type-grid" role="list">
  {#each data.types as type (type.name)}
    <li role="listitem">
      <a class="type-{type.name}" href="/types/{type.name}">{type.label}</a>
    </li>
  {/each}
</ul>
