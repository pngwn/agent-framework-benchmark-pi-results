<script>
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import PokemonCardList from '#lib/components/PokemonCardList.svelte';

  let { data } = $props();

  const PER_PAGE = 48;

  // Filter state lives in the URL query. Shallow navigations (filter changes)
  // don't touch `page.url`, so read the shallow target first.
  const currentUrl = $derived(page.shallow?.url ?? page.url);
  const q = $derived(currentUrl.searchParams.get('q') ?? '');
  const type = $derived(currentUrl.searchParams.get('type') ?? '');
  const generation = $derived(currentUrl.searchParams.get('generation') ?? '');
  const currentPage = $derived(
    Math.max(1, Number.parseInt(currentUrl.searchParams.get('page') ?? '1', 10) || 1)
  );

  const filtered = $derived.by(() => {
    const needle = q.trim().toLowerCase();
    return data.species.filter((s) => {
      if (needle && !s.human.toLowerCase().includes(needle)) return false;
      if (type && !s.types.some((t) => t.name === type)) return false;
      if (generation && s.generation !== generation) return false;
      return true;
    });
  });

  const totalPages = $derived(Math.max(1, Math.ceil(filtered.length / PER_PAGE)));
  const shownPage = $derived(Math.min(currentPage, totalPages));
  const visible = $derived(filtered.slice((shownPage - 1) * PER_PAGE, shownPage * PER_PAGE));

  // Update the URL with a shallow navigation — the list is re-filtered
  // reactively from the new URL without rerunning the load function.
  // Changing a filter resets paging.
  function updateFilters(changes) {
    const params = new URLSearchParams(currentUrl.searchParams);
    for (const [key, value] of Object.entries(changes)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    params.delete('page');
    const query = params.toString();
    goto(query ? `/?${query}` : '/', { shallow: true, replace: true });
  }

  let searchTimer;
  function onSearchInput(event) {
    const value = event.currentTarget.value;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => updateFilters({ q: value.trim() }), 150);
  }

  function pageHref(n) {
    const params = new URLSearchParams(currentUrl.searchParams);
    if (n > 1) params.set('page', String(n));
    else params.delete('page');
    const query = params.toString();
    return query ? `/?${query}` : '/';
  }
</script>

<svelte:head>
  <title>Pokédex</title>
</svelte:head>

<h1>Pokémon</h1>

<form
  class="filters"
  onsubmit={(event) => {
    event.preventDefault();
    updateFilters({ q: event.currentTarget.querySelector('input')?.value.trim() ?? '' });
  }}
>
  <div class="field">
    <label for="search">Search</label>
    <input id="search" type="search" name="q" value={q} oninput={onSearchInput} autocomplete="off" />
  </div>
  <div class="field">
    <label for="type">Type</label>
    <select
      id="type"
      name="type"
      value={type}
      onchange={(event) => updateFilters({ type: event.currentTarget.value })}
    >
      <option value="">All types</option>
      {#each data.types as t (t.name)}
        <option value={t.name}>{t.label}</option>
      {/each}
    </select>
  </div>
  <div class="field">
    <label for="generation">Generation</label>
    <select
      id="generation"
      name="generation"
      value={generation}
      onchange={(event) => updateFilters({ generation: event.currentTarget.value })}
    >
      <option value="">All generations</option>
      {#each data.generations as g (g.name)}
        <option value={g.name}>{g.label}</option>
      {/each}
    </select>
  </div>
</form>

<p class="count">{filtered.length} Pokémon</p>

{#if visible.length}
  <PokemonCardList items={visible} showTypes />
  <nav class="pagination" aria-label="Pagination">
    <p>Page {shownPage} of {totalPages}</p>
    {#if shownPage > 1}
      <a href={pageHref(shownPage - 1)}>Previous page</a>
    {/if}
    {#if shownPage < totalPages}
      <a href={pageHref(shownPage + 1)}>Next page</a>
    {/if}
  </nav>
{:else}
  <p>No Pokémon found</p>
{/if}
