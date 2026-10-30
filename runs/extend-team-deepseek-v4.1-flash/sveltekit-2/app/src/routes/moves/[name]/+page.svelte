<script lang="ts">
	import CardList from '#lib/components/CardList.svelte';
	import Section from '#lib/components/Section.svelte';
	import TypeBadge from '#lib/components/TypeBadge.svelte';
	import { DASH, orDash, pageTitle } from '#lib/format.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const move = $derived(data.move);
</script>

<svelte:head>
	<title>{pageTitle(move.label)}</title>
</svelte:head>

<h1 class="page-heading">{move.label}</h1>

<div class="stack">
	<dl class="panel facts">
		<div>
			<dt>Type</dt>
			<dd><TypeBadge type={move.type} link /></dd>
		</div>
		<div>
			<dt>Category</dt>
			<dd>{orDash(move.category)}</dd>
		</div>
		<div>
			<dt>Power</dt>
			<dd>{orDash(move.power)}</dd>
		</div>
		<div>
			<dt>Accuracy</dt>
			<dd>{orDash(move.accuracy)}</dd>
		</div>
		<div>
			<dt>PP</dt>
			<dd>{orDash(move.pp)}</dd>
		</div>
	</dl>

	<Section title="Effect">
		<p>{move.effect ?? DASH}</p>
	</Section>

	<Section title="Learned by">
		<p class="muted count">{move.learnedBy.length} Pokémon</p>
		<CardList cards={move.learnedBy} />
	</Section>
</div>

<style>
	.facts {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2) var(--space-6);
		margin: 0;
		padding: var(--space-4);
	}

	dt {
		color: var(--color-text-muted);
		font-size: var(--text-sm);
	}

	dd {
		margin: 0;
	}

	.count {
		margin-bottom: var(--space-3);
	}
</style>
