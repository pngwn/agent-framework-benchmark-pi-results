<script>
	import Section from '../../../lib/components/Section.svelte';
	import CardGrid from '../../../lib/components/CardGrid.svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>{data.name} – Pokédex</title>
</svelte:head>

<h1>{data.name}</h1>

<Section id="effect" title="Effect">
	<p>{data.effect}</p>
</Section>

<Section id="pokemon" title="Pokémon">
	<p class="count muted">{data.pokemon.length} Pokémon</p>
	<CardGrid cards={data.pokemon} />
</Section>

<style>
	.count {
		font-size: var(--text-sm);
		margin-bottom: var(--space-4);
	}
</style>
