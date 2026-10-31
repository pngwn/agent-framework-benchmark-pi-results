<script>
	import PokemonCard from './PokemonCard.svelte';

	/** A list of Pokémon cards, one per list item, ordered by dex number. */
	let { cards, showTypes = false } = $props();
</script>

<ul class="card-grid">
	{#each cards as card (card.id)}
		<li>
			<PokemonCard
				id={card.id}
				name={card.name}
				label={card.label}
				sprite={card.sprite}
				types={showTypes ? card.types : null}
				hidden={card.hidden ?? false}
			/>
		</li>
	{/each}
</ul>
