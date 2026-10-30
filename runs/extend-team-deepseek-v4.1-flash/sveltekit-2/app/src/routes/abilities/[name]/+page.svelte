<script lang="ts">
	import CardList from '#lib/components/CardList.svelte';
	import Section from '#lib/components/Section.svelte';
	import { DASH, pageTitle } from '#lib/format.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const ability = $derived(data.ability);
</script>

<svelte:head>
	<title>{pageTitle(ability.label)}</title>
</svelte:head>

<h1 class="page-heading spacious">{ability.label}</h1>

<div class="stack">
	<Section title="Effect">
		<p>{ability.effect ?? DASH}</p>
	</Section>

	<Section title="Pokémon">
		<p class="muted count">{ability.pokemon.length} Pokémon</p>
		<CardList cards={ability.pokemon} />
	</Section>
</div>

<style>
	.count {
		margin-bottom: var(--space-3);
	}
</style>
