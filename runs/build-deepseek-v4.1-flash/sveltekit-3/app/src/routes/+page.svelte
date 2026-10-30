<script>
	import { goto } from '$app/navigation';
	import { onDestroy } from 'svelte';
	import PokemonCard from '#lib/components/PokemonCard.svelte';

	let { data } = $props();

	let search = $derived(data.q);
	let typeFilter = $derived(data.type);
	let generationFilter = $derived(data.generation);
	let timer;

	onDestroy(() => clearTimeout(timer));

	function hrefFor({
		nextQ = search,
		nextType = typeFilter,
		nextGeneration = generationFilter,
		nextPage = 1
	} = {}) {
		const params = new URLSearchParams();
		if (nextQ.trim()) params.set('q', nextQ);
		if (nextType) params.set('type', nextType);
		if (nextGeneration) params.set('generation', nextGeneration);
		if (nextPage > 1) params.set('page', String(nextPage));
		const query = params.toString();
		return query ? `/?${query}` : '/';
	}

	function navigate(options, replaceState = false) {
		goto(hrefFor(options), {
			replaceState,
			keepFocus: true,
			noScroll: true
		});
	}

	function onSearchInput(event) {
		search = event.currentTarget.value;
		clearTimeout(timer);
		timer = setTimeout(() => {
			navigate({ nextPage: 1 }, true);
		}, 250);
	}

	function onTypeChange(event) {
		clearTimeout(timer);
		typeFilter = event.currentTarget.value;
		navigate({ nextType: typeFilter, nextPage: 1 });
	}

	function onGenerationChange(event) {
		clearTimeout(timer);
		generationFilter = event.currentTarget.value;
		navigate({ nextGeneration: generationFilter, nextPage: 1 });
	}
</script>

<svelte:head>
	<title>Pokédex</title>
</svelte:head>

<h1>Pokémon</h1>

<div class="filters">
	<div class="field search-field">
		<label for="search">Search</label>
		<input id="search" type="search" value={search} oninput={onSearchInput} />
	</div>
	<div class="field">
		<label for="type-filter">Type</label>
		<select id="type-filter" value={typeFilter} onchange={onTypeChange}>
			<option value="">All types</option>
			{#each data.types as type (type.name)}
				<option value={type.name}>{type.label}</option>
			{/each}
		</select>
	</div>
	<div class="field">
		<label for="generation-filter">Generation</label>
		<select id="generation-filter" value={generationFilter} onchange={onGenerationChange}>
			<option value="">All generations</option>
			{#each data.generations as generation (generation.name)}
				<option value={generation.name}>{generation.label}</option>
			{/each}
		</select>
	</div>
</div>

{#if data.total > 0}
	<p class="count">{data.total} Pokémon</p>
	<ul class="cards">
		{#each data.cards as pokemon (pokemon.id)}
			<PokemonCard {pokemon} types={pokemon.types} />
		{/each}
	</ul>
	<div class="pagination">
		<span>Page {data.page} of {data.totalPages}</span>
		{#if data.page > 1}
			<a href={hrefFor({ nextPage: data.page - 1 })}>Previous page</a>
		{/if}
		{#if data.page < data.totalPages}
			<a href={hrefFor({ nextPage: data.page + 1 })}>Next page</a>
		{/if}
	</div>
{:else}
	<p class="no-results">No Pokémon found</p>
{/if}

<style>
	.filters {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: var(--space-3);
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	.field label {
		color: var(--color-text-muted);
		font-size: var(--text-sm);
	}

	.field input,
	.field select {
		width: 100%;
		height: 2.375rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		background: var(--color-surface);
		padding: 0 var(--space-2);
		color: var(--color-text);
	}

	.field input:focus-visible,
	.field select:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 1px;
	}

	.count {
		margin-top: var(--space-4);
		color: var(--color-text-muted);
		font-size: var(--text-sm);
	}

	.pagination {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-4);
		margin-top: var(--space-5);
		font-size: var(--text-sm);
	}

	.no-results {
		margin-top: var(--space-5);
		color: var(--color-text-muted);
	}

	@media (min-width: 48rem) {
		.filters {
			grid-template-columns: minmax(0, 2fr) minmax(0, 1fr) minmax(0, 1fr);
			gap: var(--space-4);
		}
	}
</style>
