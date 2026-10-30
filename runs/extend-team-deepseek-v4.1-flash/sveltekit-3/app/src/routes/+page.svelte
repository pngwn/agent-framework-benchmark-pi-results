<script lang="ts">
	import { afterNavigate, goto } from '$app/navigation';
	import { page } from '$app/state';
	import CardList from '#lib/components/CardList.svelte';
	import { pageTitle } from '#lib/format.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	type Filters = { q: string; type: string; generation: string; page: number };

	// The search box is driven by local state so results arriving from earlier keystrokes
	// never overwrite what the user is still typing.
	let q = $state(page.url.searchParams.get('q') ?? '');
	let timer: ReturnType<typeof setTimeout> | undefined;

	afterNavigate(({ type }) => {
		if (type !== 'goto') q = page.url.searchParams.get('q') ?? '';
	});

	function href(filters: Filters): string {
		const params = new URLSearchParams();
		if (filters.q.trim()) params.set('q', filters.q.trim());
		if (filters.type) params.set('type', filters.type);
		if (filters.generation) params.set('generation', filters.generation);
		if (filters.page > 1) params.set('page', String(filters.page));
		const query = params.toString();
		return query ? `/?${query}` : '/';
	}

	function update(changes: Partial<Filters>, replace = false) {
		clearTimeout(timer);
		const target = href({ ...data.filters, q, page: 1, ...changes });
		if (target === page.url.pathname + page.url.search) return;
		goto(target, { replace, reset: false });
	}

	function oninput() {
		clearTimeout(timer);
		timer = setTimeout(() => update({ q }, true), 200);
	}
</script>

<svelte:head>
	<title>{pageTitle()}</title>
</svelte:head>

<h1 class="page-heading">Pokémon</h1>

<form
	class="filters"
	method="get"
	action="/"
	role="search"
	onsubmit={(event) => {
		event.preventDefault();
		update({ q });
	}}
>
	<div class="field search">
		<label for="search">Search</label>
		<input id="search" type="search" name="q" autocomplete="off" bind:value={q} {oninput} />
	</div>
	<div class="field">
		<label for="type">Type</label>
		<select id="type" name="type" onchange={(event) => update({ type: event.currentTarget.value })}>
			<option value="" selected={!data.filters.type}>All types</option>
			{#each data.typeOptions as option (option.name)}
				<option value={option.name} selected={option.name === data.filters.type}>{option.label}</option>
			{/each}
		</select>
	</div>
	<div class="field">
		<label for="generation">Generation</label>
		<select id="generation" name="generation" onchange={(event) => update({ generation: event.currentTarget.value })}>
			<option value="" selected={!data.filters.generation}>All generations</option>
			{#each data.generationOptions as option (option.name)}
				<option value={option.name} selected={option.name === data.filters.generation}>{option.label}</option>
			{/each}
		</select>
	</div>
</form>

<p class="muted count">{data.count} Pokémon</p>

{#if data.cards.length}
	<CardList cards={data.cards} showTypes />
{:else}
	<p class="empty">No Pokémon found</p>
{/if}

<nav class="pagination" aria-label="Pagination">
	{#if data.page > 1}
		<a href={href({ ...data.filters, page: data.page - 1 })}>Previous page</a>
	{/if}
	<span>Page {data.page} of {data.totalPages}</span>
	{#if data.page < data.totalPages}
		<a href={href({ ...data.filters, page: data.page + 1 })}>Next page</a>
	{/if}
</nav>

<style>
	.filters {
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--space-3);
		margin-bottom: var(--space-4);
	}

	@media (min-width: 48rem) {
		.filters {
			grid-template-columns: 2fr 1fr 1fr;
			gap: var(--space-3);
		}
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
		border-radius: var(--radius-md);
	}

	.count {
		margin-bottom: var(--space-3);
	}

	.empty {
		padding: var(--space-6) 0;
		text-align: center;
		color: var(--color-text-muted);
	}

	.pagination {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: var(--space-5);
		margin-top: var(--space-5);
		font-size: var(--text-sm);
	}
</style>
