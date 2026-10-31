<script>
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import PokemonCard from '#lib/PokemonCard.svelte';

	let { data } = $props();

	const PAGE_SIZE = 48;

	// Filter state lives in the URL query. Shallow routing (used while filtering)
	// exposes the visible URL as page.shallow.url rather than page.url.
let currentUrl = $derived(page.shallow?.url ?? page.url);
	let q = $derived(currentUrl.searchParams.get('q') ?? '');
	let type = $derived(currentUrl.searchParams.get('type') ?? '');
	let generation = $derived(currentUrl.searchParams.get('generation') ?? '');
	let requestedPage = $derived(
		Math.max(1, Number.parseInt(currentUrl.searchParams.get('page') ?? '1', 10) || 1)
	);

	let filtered = $derived.by(() => {
		const query = q.trim().toLowerCase();
		return data.species.filter((s) => {
			if (query && !s.human.toLowerCase().includes(query)) return false;
			if (type && !s.types.some((t) => t.name === type)) return false;
			if (generation && s.generation !== generation) return false;
			return true;
		});
	});

	let totalPages = $derived(Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)));
	let currentPage = $derived(Math.min(requestedPage, totalPages));
	let visible = $derived(filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE));

	// Build a home-page URL; parameters that are empty or at their default are omitted.
	function filtersUrl({ query = q, typeName = type, generationName = generation, pageNumber = 1 } = {}) {
		const params = new URLSearchParams();
		if (query.trim()) params.set('q', query.trim());
		if (typeName) params.set('type', typeName);
		if (generationName) params.set('generation', generationName);
		if (pageNumber > 1) params.set('page', String(pageNumber));
		const qs = params.toString();
		return qs ? `/?${qs}` : '/';
	}

	function onSearch(event) {
		// Replace the history entry while typing.
		goto(filtersUrl({ query: event.currentTarget.value }), {
			shallow: true,
			replace: true,
			reset: false
		});
	}

	function onType(event) {
		// Changing a filter goes back to page 1.
		goto(filtersUrl({ typeName: event.currentTarget.value }), { shallow: true, reset: false });
	}

	function onGeneration(event) {
		goto(filtersUrl({ generationName: event.currentTarget.value }), { shallow: true, reset: false });
	}
</script>

<svelte:head>
	<title>Pokédex</title>
</svelte:head>

<h1>Pokémon</h1>

<div class="filters">
	<div class="field">
		<label for="search">Search</label>
		<input id="search" type="search" value={q} oninput={onSearch} autocomplete="off" />
	</div>
	<div class="field">
		<label for="type-filter">Type</label>
		<select id="type-filter" value={type} onchange={onType}>
			<option value="">All types</option>
			{#each data.types as t (t.name)}
				<option value={t.name}>{t.en}</option>
			{/each}
		</select>
	</div>
	<div class="field">
		<label for="generation-filter">Generation</label>
		<select id="generation-filter" value={generation} onchange={onGeneration}>
			<option value="">All generations</option>
			{#each data.generations as g (g.name)}
				<option value={g.name}>{g.en}</option>
			{/each}
		</select>
	</div>
</div>

<p class="count">{filtered.length} Pokémon</p>

{#if filtered.length === 0}
	<p class="empty">No Pokémon found</p>
{:else}
	<ul class="card-grid">
		{#each visible as s (s.id)}
			<PokemonCard id={s.id} name={s.name} human={s.human} sprite={s.sprite} types={s.types} />
		{/each}
	</ul>
	<div class="pagination">
		<span>Page {currentPage} of {totalPages}</span>
		{#if currentPage > 1}
			<a href={filtersUrl({ pageNumber: currentPage - 1 })}>Previous page</a>
		{/if}
		{#if currentPage < totalPages}
			<a href={filtersUrl({ pageNumber: currentPage + 1 })}>Next page</a>
		{/if}
	</div>
{/if}
