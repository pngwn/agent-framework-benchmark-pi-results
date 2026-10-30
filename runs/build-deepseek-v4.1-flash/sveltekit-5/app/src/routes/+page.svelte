<script>
	import { goto, afterNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import PokemonCard from '#lib/components/PokemonCard.svelte';

	let { data } = $props();

	const initial = page.url.searchParams;
	const initialType = initial.get('type') ?? '';
	const initialGeneration = initial.get('generation') ?? '';
	const initialPage = Number.parseInt(initial.get('page') ?? '1', 10);

	let search = $state(initial.get('q') ?? '');
	let selectedType = $state(initialType);
	let selectedGeneration = $state(initialGeneration);
	let pageNumber = $state(Number.isFinite(initialPage) && initialPage > 0 ? initialPage : 1);

	const PAGE_SIZE = 48;

	let filtered = $derived.by(() => {
		const query = search.trim().toLowerCase();
		return data.pokemon.filter((pokemon) => {
			if (query && !pokemon.humanName.toLowerCase().includes(query)) return false;
			if (selectedType && !pokemon.types.some((type) => type.name === selectedType)) return false;
			if (selectedGeneration && pokemon.generation !== selectedGeneration) return false;
			return true;
		});
	});

	let totalPages = $derived(Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)));
	let currentPage = $derived(Math.min(Math.max(1, pageNumber), totalPages));
	let visible = $derived(filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE));

	function queryUrl(targetPage = pageNumber) {
		const params = new URLSearchParams();
		const query = search.trim();
		if (query) params.set('q', query);
		if (selectedType) params.set('type', selectedType);
		if (selectedGeneration) params.set('generation', selectedGeneration);
		if (targetPage > 1) params.set('page', String(targetPage));
		const queryString = params.toString();
		return queryString ? `/?${queryString}` : '/';
	}

	function updateUrl(push = false, targetPage = pageNumber) {
		goto(queryUrl(targetPage), {
			shallow: true,
			replace: !push,
			reset: false,
			state: {}
		});
	}

	function onSearchInput(event) {
		search = event.currentTarget.value;
		pageNumber = 1;
		updateUrl(false, 1);
	}

	function onTypeChange(event) {
		selectedType = event.currentTarget.value;
		pageNumber = 1;
		updateUrl(true, 1);
	}

	function onGenerationChange(event) {
		selectedGeneration = event.currentTarget.value;
		pageNumber = 1;
		updateUrl(true, 1);
	}

	function handlePageClick(event, targetPage) {
		if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
		event.preventDefault();
		pageNumber = targetPage;
		updateUrl(true, targetPage);
	}

	function syncFromUrl(url) {
		const params = url.searchParams;
		const type = params.get('type') ?? '';
		const generation = params.get('generation') ?? '';
		const parsedPage = Number.parseInt(params.get('page') ?? '1', 10);
		search = params.get('q') ?? '';
		selectedType = data.types.some((entry) => entry.name === type) ? type : '';
		selectedGeneration = data.generations.some((entry) => entry.name === generation) ? generation : '';
		pageNumber = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
	}

	afterNavigate((navigation) => {
		if (navigation.type === 'popstate') syncFromUrl(navigation.to.url);
	});
</script>

<svelte:head>
	<title>Pokédex</title>
</svelte:head>

<h1 class="page-heading">Pokémon</h1>

<div class="filters">
	<div class="field search-field">
		<label for="search">Search</label>
		<input
			id="search"
			type="search"
			value={search}
			oninput={onSearchInput}
			autocomplete="off"
			placeholder=""
		/>
	</div>
	<div class="field">
		<label for="type-filter">Type</label>
		<select id="type-filter" value={selectedType} onchange={onTypeChange}>
			<option value="">All types</option>
			{#each data.types as type}
				<option value={type.name}>{type.englishName}</option>
			{/each}
		</select>
	</div>
	<div class="field">
		<label for="generation-filter">Generation</label>
		<select id="generation-filter" value={selectedGeneration} onchange={onGenerationChange}>
			<option value="">All generations</option>
			{#each data.generations as generation}
				<option value={generation.name}>{generation.englishName}</option>
			{/each}
		</select>
	</div>
</div>

<p class="count">{filtered.length} Pokémon</p>

{#if filtered.length}
	<ul class="card-grid">
		{#each visible as pokemon (pokemon.id)}
			<PokemonCard {pokemon} showTypes />
		{/each}
	</ul>

	<nav class="pagination" aria-label="Pagination">
		{#if currentPage > 1}
			<a
				href={queryUrl(currentPage - 1)}
				onclick={(event) => handlePageClick(event, currentPage - 1)}>Previous page</a
			>
		{/if}
		<span class="page-status">Page {currentPage} of {totalPages}</span>
		{#if currentPage < totalPages}
			<a href={queryUrl(currentPage + 1)} onclick={(event) => handlePageClick(event, currentPage + 1)}
				>Next page</a
			>
		{/if}
	</nav>
{:else}
	<p class="empty">No Pokémon found</p>
{/if}

<style>
	.filters {
		display: grid;
		grid-template-columns: minmax(0, 2fr) minmax(0, 1fr) minmax(0, 1fr);
		gap: var(--space-4);
		align-items: end;
		margin-bottom: var(--space-4);
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		min-width: 0;
	}

	label {
		color: var(--color-text-muted);
		font-size: var(--text-sm);
	}

	input,
	select {
		width: 100%;
		height: 2.5rem;
		padding: 0 var(--space-3);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		color: var(--color-text);
	}

	.count {
		margin-bottom: var(--space-4);
	}

	.pagination {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-3);
		margin-top: var(--space-5);
		font-size: var(--text-sm);
	}

	.page-status {
		color: var(--color-text);
	}

	@media (max-width: 43rem) {
		.filters {
			grid-template-columns: minmax(0, 1fr);
			gap: var(--space-3);
			margin-bottom: var(--space-4);
		}
	}
</style>
