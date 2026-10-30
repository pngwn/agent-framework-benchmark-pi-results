<script>
	import { onDestroy, untrack } from 'svelte';
	import { goto } from '$app/navigation';
	import PokemonCard from '#lib/components/PokemonCard.svelte';

	let { data } = $props();

	const initialFilters = untrack(() => data.filters);
	let q = $state(initialFilters.q);
	let pending = $state(false);
	let timer;

	let displayedQ = $derived(pending ? q : data.filters.q);

	function urlFor({ nextQ, nextType, nextGeneration, nextPage = 1 }) {
		const params = new URLSearchParams();
		const query = nextQ.trim();
		if (query) params.set('q', query);
		if (nextType) params.set('type', nextType);
		if (nextGeneration) params.set('generation', nextGeneration);
		if (nextPage > 1) params.set('page', String(nextPage));
		const search = params.toString();
		return search ? `/?${search}` : '/';
	}

	async function commit(overrides = {}) {
		const next = {
			nextQ: pending ? q : data.filters.q,
			nextType: data.filters.type,
			nextGeneration: data.filters.generation,
			nextPage: 1,
			...overrides
		};
		await goto(urlFor(next), {
			keepFocus: true,
			noScroll: true,
			replaceState: true
		});
		pending = false;
	}

	function onSearch(event) {
		q = event.currentTarget.value;
		pending = true;
		clearTimeout(timer);
		timer = setTimeout(() => {
			timer = undefined;
			commit({ nextQ: q });
		}, 200);
	}

	function onTypeChange(event) {
		clearTimeout(timer);
		timer = undefined;
		commit({ nextType: event.currentTarget.value });
	}

	function onGenerationChange(event) {
		clearTimeout(timer);
		timer = undefined;
		commit({ nextGeneration: event.currentTarget.value });
	}

	function pageHref(page) {
		return urlFor({
			nextQ: data.filters.q,
			nextType: data.filters.type,
			nextGeneration: data.filters.generation,
			nextPage: page
		});
	}

	onDestroy(() => clearTimeout(timer));
</script>

<svelte:head>
	<title>Pokédex</title>
</svelte:head>

<h1 class="page-title">Pokémon</h1>

<form class="filters" onsubmit={(event) => event.preventDefault()} aria-label="Filters">
	<label class="field">
		<span>Search</span>
		<input type="search" value={displayedQ} oninput={onSearch} autocomplete="off" />
	</label>

	<div class="field">
		<label for="type-filter">Type</label>
		<select id="type-filter" value={data.filters.type} onchange={onTypeChange}>
			<option value="">All types</option>
			{#each data.types as item (item.name)}
				<option value={item.name}>{item.englishName}</option>
			{/each}
		</select>
	</div>

	<div class="field">
		<label for="generation-filter">Generation</label>
		<select id="generation-filter" value={data.filters.generation} onchange={onGenerationChange}>
			<option value="">All generations</option>
			{#each data.generations as item (item.name)}
				<option value={item.name}>{item.englishName}</option>
			{/each}
		</select>
	</div>
</form>

<p class="result-count">{data.count} Pokémon</p>

{#if data.cards.length}
	<ul class="card-grid">
		{#each data.cards as pokemon (pokemon.id)}
			<PokemonCard {pokemon} showTypes />
		{/each}
	</ul>
{:else}
	<p class="no-results">No Pokémon found</p>
{/if}

{#if data.count > 0}
	<nav class="pagination" aria-label="Pagination">
		{#if data.page > 1}
			<a href={pageHref(data.page - 1)}>Previous page</a>
		{/if}
		<span>Page {data.page} of {data.totalPages}</span>
		{#if data.page < data.totalPages}
			<a href={pageHref(data.page + 1)}>Next page</a>
		{/if}
	</nav>
{/if}
