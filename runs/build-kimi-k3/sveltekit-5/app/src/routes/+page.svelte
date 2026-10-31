<script>
  import { replaceState } from '$app/navigation';
  import CardGrid from '#lib/CardGrid.svelte';

  const PAGE_SIZE = 48;

  let { data } = $props();

  // Writable deriveds: local filter state initialized from the URL (via the
  // load data), re-initialized whenever the page data changes (e.g. after
  // following a pagination link or loading a filtered URL directly).
  let q = $derived(data.filters.q);
  let type = $derived(data.filters.type);
  let generation = $derived(data.filters.generation);
  let pageNumber = $derived(data.filters.page);

  const filtered = $derived.by(() => {
    const needle = q.trim().toLowerCase();
    return data.species.filter(
      (s) =>
        (!needle || s.human.toLowerCase().includes(needle)) &&
        (!type || s.types.some((t) => t.name === type)) &&
        (!generation || s.generation === generation)
    );
  });

  const totalPages = $derived(Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)));
  const currentPage = $derived(Math.min(Math.max(1, pageNumber), totalPages));
  const pageItems = $derived(
    filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  );

  function queryString(page) {
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (type) params.set('type', type);
    if (generation) params.set('generation', generation);
    if (page > 1) params.set('page', String(page));
    const qs = params.toString();
    return qs ? `/?${qs}` : '/';
  }

  let searchTimer;
  function syncUrl() {
    replaceState(queryString(currentPage), {});
  }

  function onSearchInput(event) {
    q = event.currentTarget.value;
    pageNumber = 1;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(syncUrl, 200);
  }

  function onTypeChange(event) {
    type = event.currentTarget.value;
    pageNumber = 1;
    syncUrl();
  }

  function onGenerationChange(event) {
    generation = event.currentTarget.value;
    pageNumber = 1;
    syncUrl();
  }
</script>

<svelte:head>
  <title>Pokédex</title>
</svelte:head>

<h1>Pokémon</h1>

<form class="controls" role="search" onsubmit={(e) => e.preventDefault()}>
  <div class="control">
    <label for="search">Search</label>
    <input id="search" type="search" value={q} oninput={onSearchInput} autocomplete="off" />
  </div>
  <div class="control">
    <label for="type">Type</label>
    <select id="type" onchange={onTypeChange}>
      <option value="" selected={type === ''}>All types</option>
      {#each data.types as t (t.name)}
        <option value={t.name} selected={type === t.name}>{t.en}</option>
      {/each}
    </select>
  </div>
  <div class="control">
    <label for="generation">Generation</label>
    <select id="generation" onchange={onGenerationChange}>
      <option value="" selected={generation === ''}>All generations</option>
      {#each data.generations as g (g.name)}
        <option value={g.name} selected={generation === g.name}>{g.en}</option>
      {/each}
    </select>
  </div>
</form>

<p class="count muted">{filtered.length} Pokémon</p>

{#if pageItems.length}
  <CardGrid items={pageItems} showTypes={true} />
{:else}
  <p>No Pokémon found</p>
{/if}

{#if filtered.length}
  <nav class="pagination" aria-label="Pagination">
    <span class="page-status">Page {currentPage} of {totalPages}</span>
    {#if currentPage > 1}
      <a href={queryString(currentPage - 1)}>Previous page</a>
    {/if}
    {#if currentPage < totalPages}
      <a href={queryString(currentPage + 1)}>Next page</a>
    {/if}
  </nav>
{/if}

<style>
  .controls {
    display: grid;
    grid-template-columns: 2fr 1fr 1fr;
    gap: var(--space-4);
    margin-bottom: var(--space-4);
  }

  .count {
    font-size: var(--text-sm);
    margin-bottom: var(--space-3);
  }

  .pagination {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: var(--space-5);
    margin-top: var(--space-5);
    font-size: var(--text-sm);
  }

  @media (max-width: 40rem) {
    .controls {
      grid-template-columns: 1fr;
    }
  }
</style>
