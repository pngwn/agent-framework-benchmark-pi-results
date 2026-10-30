<script>
	import { page } from '$app/state';
	import { replaceState } from '$app/navigation';
	import PokemonCard from '#lib/components/PokemonCard.svelte';

	let { data } = $props();

	const PAGE_SIZE = 48;

	const initialUrl = page.url;
	let search = $state(initialUrl.searchParams.get('q') ?? '');
	let typeFilter = $state(initialUrl.searchParams.get('type') ?? '');
	let generationFilter = $state(initialUrl.searchParams.get('generation') ?? '');
	let currentPage = $state(Math.max(1, Number(initialUrl.searchParams.get('page')) || 1));

	const filtered = $derived.by(() => {
		const needle = search.trim().toLowerCase();
		return data.species.filter((pokemon) => {
			if (needle && !pokemon.label.toLowerCase().includes(needle)) return false;
			if (typeFilter && !pokemon.types.some((type) => type.name === typeFilter)) return false;
			if (generationFilter && pokemon.generation !== generationFilter) return false;
			return true;
		});
	});

	const count = $derived(filtered.length);
	const totalPages = $derived(Math.max(1, Math.ceil(count / PAGE_SIZE)));
	const visible = $derived(filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE));

	function syncUrl() {
		const url = new URL(page.url);
		const values = {
			q: search.trim() ? search : null,
			type: typeFilter || null,
			generation: generationFilter || null,
			page: currentPage === 1 ? null : currentPage
		};

		for (const [key, value] of Object.entries(values)) {
			if (value === null) url.searchParams.delete(key);
			else url.searchParams.set(key, String(value));
		}
		replaceState(url, page.state);
	}

	function onSearch(event) {
		search = event.currentTarget.value;
		currentPage = 1;
		syncUrl();
	}

	function onType(event) {
		typeFilter = event.currentTarget.value;
		currentPage = 1;
		syncUrl();
	}

	function onGeneration(event) {
		generationFilter = event.currentTarget.value;
		currentPage = 1;
		syncUrl();
	}

	function pageHref(number) {
		const url = new URL(page.url);
		const values = {
			q: search.trim() ? search : null,
			type: typeFilter || null,
			generation: generationFilter || null,
			page: number === 1 ? null : number
		};
		for (const [key, value] of Object.entries(values)) {
			if (value === null) url.searchParams.delete(key);
			else url.searchParams.set(key, String(value));
		}
		return `${url.pathname}${url.search}${url.hash}`;
	}

	function goToPage(event, number) {
		event.preventDefault();
		currentPage = number;
		syncUrl();
	}
</script>

<svelte:head>
	<title>Pokédex</title>
</svelte:head>

<h1>Pokémon</h1>

<form class="filters" onsubmit={(event) => event.preventDefault()}>
	<div class="field field-search">
		<label class="field-label" for="search">Search</label>
		<input
			class="text-input"
			id="search"
			type="search"
			value={search}
			oninput={onSearch}
		/>
	</div>
	<div class="field">
		<label class="field-label" for="type-filter">Type</label>
		<select class="select-input" id="type-filter" onchange={onType}>
			<option value="" selected={!typeFilter}>All types</option>
			{#each data.types as type}
				<option value={type.name} selected={type.name === typeFilter}>{type.label}</option>
			{/each}
		</select>
	</div>
	<div class="field">
		<label class="field-label" for="generation-filter">Generation</label>
		<select
			class="select-input"
			id="generation-filter"
			onchange={onGeneration}
		>
			<option value="" selected={!generationFilter}>All generations</option>
			{#each data.generations as generation}
				<option
					value={generation.name}
					selected={generation.name === generationFilter}>{generation.label}</option
				>
			{/each}
		</select>
	</div>
</form>

<p class="page-count">{count} Pokémon</p>

{#if count === 0}
	<p>No Pokémon found</p>
{:else}
	<ul class="card-grid">
		{#each visible as pokemon (pokemon.id)}
			<PokemonCard {pokemon} showTypes />
		{/each}
	</ul>

	{#if currentPage <= totalPages}
		<div class="pagination">
			{#if currentPage > 1}
				<a href={pageHref(currentPage - 1)} onclick={(event) => goToPage(event, currentPage - 1)}>
					Previous page
				</a>
			{/if}
			<span>Page {currentPage} of {totalPages}</span>
			{#if currentPage < totalPages}
				<a href={pageHref(currentPage + 1)} onclick={(event) => goToPage(event, currentPage + 1)}>
					Next page
				</a>
			{/if}
		</div>
	{/if}
{/if}

<style>
	.filters {
		display: grid;
		grid-template-columns: 2fr 1fr 1fr;
		gap: var(--space-4);
		margin-bottom: var(--space-4);
	}

	.field-search {
		min-width: 0;
	}

	@media (max-width: 48rem) {
		.filters {
			grid-template-columns: 1fr;
			gap: var(--space-3);
		}
	}
</style>
