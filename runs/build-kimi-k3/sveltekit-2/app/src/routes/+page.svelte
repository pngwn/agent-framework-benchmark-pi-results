<script>
  import { goto } from '$app/navigation';
  import PokemonCard from '#lib/PokemonCard.svelte';

  let { data } = $props();

  // The URL is the source of truth for the filters; the search box keeps a
  // local value while typing and syncs it to the URL after a short debounce.
  let searchText = $state(data.q);
  let lastSyncedQ = data.q;

  $effect(() => {
    const q = data.q;
    if (q !== lastSyncedQ) {
      lastSyncedQ = q;
      searchText = q;
    }
  });

  function buildUrl({ q = data.q, type = data.type, generation = data.generation, page = 1 } = {}) {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (type) params.set('type', type);
    if (generation) params.set('generation', generation);
    if (page > 1) params.set('page', String(page));
    const s = params.toString();
    return s ? `/?${s}` : '/';
  }

  let debounce;
  function onSearchInput(event) {
    searchText = event.currentTarget.value;
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      const q = searchText.trim();
      if (q !== data.q) {
        lastSyncedQ = q;
        goto(buildUrl({ q, page: 1 }), { replaceState: true, noScroll: true, keepFocus: true });
      }
    }, 200);
  }

  function onTypeChange(event) {
    goto(buildUrl({ type: event.currentTarget.value, page: 1 }), { noScroll: true });
  }

  function onGenerationChange(event) {
    goto(buildUrl({ generation: event.currentTarget.value, page: 1 }), { noScroll: true });
  }
</script>

<svelte:head>
  <title>Pokédex</title>
</svelte:head>

<h1>Pokémon</h1>

<form class="controls" onsubmit={(event) => event.preventDefault()}>
  <div class="field">
    <label for="search">Search</label>
    <input id="search" type="search" data-search value={searchText} oninput={onSearchInput} autocomplete="off" />
  </div>
  <div class="field">
    <label for="type-filter">Type</label>
    <select id="type-filter" value={data.type} onchange={onTypeChange}>
      <option value="">All types</option>
      {#each data.types as type (type.name)}
        <option value={type.name}>{type.en}</option>
      {/each}
    </select>
  </div>
  <div class="field">
    <label for="generation-filter">Generation</label>
    <select id="generation-filter" value={data.generation} onchange={onGenerationChange}>
      <option value="">All generations</option>
      {#each data.generations as generation (generation.name)}
        <option value={generation.name}>{generation.en}</option>
      {/each}
    </select>
  </div>
</form>

<p class="count">{data.count} Pokémon</p>

{#if data.cards.length}
  <ul class="card-grid">
    {#each data.cards as card (card.id)}
      <PokemonCard {card} showTypes />
    {/each}
  </ul>
{:else}
  <p>No Pokémon found</p>
{/if}

<div class="pagination">
  {#if data.page > 1}
    <a href={buildUrl({ page: data.page - 1 })}>Previous page</a>
  {/if}
  <p>Page {data.page} of {data.totalPages}</p>
  {#if data.page < data.totalPages}
    <a href={buildUrl({ page: data.page + 1 })}>Next page</a>
  {/if}
</div>
