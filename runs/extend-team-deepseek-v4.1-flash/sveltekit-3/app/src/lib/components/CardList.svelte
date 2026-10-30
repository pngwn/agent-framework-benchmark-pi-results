<script lang="ts">
	import type { Card } from '../types.ts';
	import PokemonCard from './PokemonCard.svelte';

	let { cards, showTypes = false }: { cards: Card[]; showTypes?: boolean } = $props();
</script>

<ul class="cards">
	{#each cards as card (card.id)}
		<li><PokemonCard {card} {showTypes} /></li>
	{/each}
</ul>

<style>
	.cards {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(var(--card-min-width), 1fr));
		gap: var(--space-3);
		margin: 0;
		padding: 0;
		list-style: none;
	}
</style>
