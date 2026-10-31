<script>
	import { afterNavigate, goto } from '$app/navigation';
	import CardGrid from '../lib/components/CardGrid.svelte';

	let { data } = $props();

	// While the user is typing, `typed` overrides the URL-driven search text
	// so the input stays responsive; once the navigation settles the
	// server-provided value takes over again.
	let typed = $state(null);
	let q = $derived(typed ?? data.q);

	afterNavigate(() => {
		typed = null;
	});

	function queryString({ search = q, type = data.type, generation = data.generation, page = 1 } = {}) {
		const params = new URLSearchParams();
		const trimmed = search.trim();
		if (trimmed) params.set('q', trimmed);
		if (type) params.set('type', type);
		if (generation) params.set('generation', generation);
		if (page > 1) params.set('page', String(page));
		const s = params.toString();
		return s ? `/?${s}` : '/';
	}

	let debounce;
	function onSearchInput(event) {
		typed = event.currentTarget.value;
		clearTimeout(debounce);
		debounce = setTimeout(() => {
			goto(queryString(), { reset: false, replace: true });
		}, 250);
	}

	function onTypeChange(event) {
		goto(queryString({ type: event.currentTarget.value }), { reset: false });
	}

	function onGenerationChange(event) {
		goto(queryString({ generation: event.currentTarget.value }), { reset: false });
	}
</script>

<svelte:head>
	<title>Pokédex</title>
</svelte:head>

<h1>Pokémon</h1>

<div class="controls">
	<div class="control control-search">
		<label for="search">Search</label>
		<input id="search" type="search" value={q} oninput={onSearchInput} autocomplete="off" />
	</div>
	<div class="control">
		<label for="type">Type</label>
		<select id="type" value={data.type} onchange={onTypeChange}>
			<option value="">All types</option>
			{#each data.types as type (type.name)}
				<option value={type.name}>{type.label}</option>
			{/each}
		</select>
	</div>
	<div class="control">
		<label for="generation">Generation</label>
		<select id="generation" value={data.generation} onchange={onGenerationChange}>
			<option value="">All generations</option>
			{#each data.generations as generation (generation.name)}
				<option value={generation.name}>{generation.label}</option>
			{/each}
		</select>
	</div>
</div>

<p class="count">{data.count} Pokémon</p>

{#if data.cards.length}
	<CardGrid cards={data.cards} showTypes />
{:else}
	<p>No Pokémon found</p>
{/if}

<div class="pagination">
	{#if data.page > 1}
		<a href={queryString({ page: data.page - 1 })}>Previous page</a>
	{/if}
	<span>Page {data.page} of {data.totalPages}</span>
	{#if data.page < data.totalPages}
		<a href={queryString({ page: data.page + 1 })}>Next page</a>
	{/if}
</div>

<style>
	.controls {
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--space-4);
		margin-bottom: var(--space-5);
	}

	@media (min-width: 48rem) {
		.controls {
			grid-template-columns: 2fr 1fr 1fr;
		}
	}

	.control select {
		width: 100%;
	}

	.count {
		color: var(--color-text-muted);
		font-size: var(--text-sm);
		margin-bottom: var(--space-4);
	}

	.pagination {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-5);
		margin-top: var(--space-6);
	}
</style>
