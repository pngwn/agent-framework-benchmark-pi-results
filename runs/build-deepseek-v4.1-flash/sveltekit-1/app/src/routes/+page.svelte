<script>
  import { goto } from '$app/navigation';
  import PokemonCard from '#lib/components/PokemonCard.svelte';

  let { data } = $props();
  let searchTimer;

  function urlFor({ q = data.q, type = data.type, generation = data.generation, page = 1 }) {
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (type) params.set('type', type);
    if (generation) params.set('generation', generation);
    if (page > 1) params.set('page', String(page));
    const query = params.toString();
    return query ? `/?${query}` : '/';
  }

  function onSearch(event) {
    const value = event.currentTarget.value;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      goto(urlFor({ q: value }), { keepFocus: true, noScroll: true, replaceState: true });
    }, 200);
  }

  function onType(event) {
    goto(urlFor({ type: event.currentTarget.value }), { keepFocus: true, noScroll: true });
  }

  function onGeneration(event) {
    goto(urlFor({ generation: event.currentTarget.value }), { keepFocus: true, noScroll: true });
  }

  const previousHref = () => urlFor({ page: data.page - 1 });
  const nextHref = () => urlFor({ page: data.page + 1 });
</script>

<svelte:head>
  <title>Pokédex</title>
</svelte:head>

<h1>Pokémon</h1>

<div class="filters">
  <div class="field search-field">
    <label for="search">Search</label>
    <input id="search" type="search" value={data.q} oninput={onSearch} autocomplete="off" />
  </div>
  <div class="field">
    <label for="type-filter">Type</label>
    <select id="type-filter" onchange={onType}>
      <option value="" selected={data.type === ''}>All types</option>
      {#each data.typeOptions as type}
        <option value={type.name} selected={data.type === type.name}>{type.label}</option>
      {/each}
    </select>
  </div>
  <div class="field">
    <label for="generation-filter">Generation</label>
    <select id="generation-filter" onchange={onGeneration}>
      <option value="" selected={data.generation === ''}>All generations</option>
      {#each data.generationOptions as generation}
        <option value={generation.name} selected={data.generation === generation.name}>{generation.label}</option>
      {/each}
    </select>
  </div>
</div>

<p class="count">{data.count} Pokémon</p>

{#if data.count === 0}
  <p class="empty">No Pokémon found</p>
{:else}
  <ul class="pokemon-grid">
    {#each data.cards as pokemon (pokemon.id)}
      <PokemonCard {pokemon} showTypes />
    {/each}
  </ul>

  <div class="pagination">
    <p>Page {data.page} of {data.totalPages}</p>
    {#if data.page > 1}
      <a href={previousHref()}>Previous page</a>
    {/if}
    {#if data.page < data.totalPages}
      <a href={nextHref()}>Next page</a>
    {/if}
  </div>
{/if}
