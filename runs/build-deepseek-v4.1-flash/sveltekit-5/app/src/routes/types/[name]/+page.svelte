<script>
	import PokemonCard from '#lib/components/PokemonCard.svelte';
	import TypeBadge from '#lib/components/TypeBadge.svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>{data.heading} – Pokédex</title>
</svelte:head>

<h1 class="page-heading">{data.heading}</h1>

<section class="panel relations-panel" aria-labelledby="relations-heading">
	<h2 id="relations-heading">Damage relations</h2>
	<dl class="relations">
		{#each data.relations as relation}
			<div>
				<dt>{relation.label}</dt>
				<dd>
					{#if relation.types.length}
						{#each relation.types as type}
							<TypeBadge name={type.name} englishName={type.englishName} link />
						{/each}
					{:else}
						None
					{/if}
				</dd>
			</div>
		{/each}
	</dl>
</section>

<section class="panel" aria-labelledby="pokemon-heading">
	<h2 id="pokemon-heading">Pokémon</h2>
	<p class="count">{data.cards.length} Pokémon</p>
	<ul class="card-grid">
		{#each data.cards as pokemon (pokemon.id)}
			<PokemonCard {pokemon} />
		{/each}
	</ul>
</section>

<section class="panel" aria-labelledby="moves-heading">
	<h2 id="moves-heading">Moves</h2>
	<p class="count">{data.moves.length} moves</p>
	<ul class="link-grid">
		{#each data.moves as move}
			<li><a href="/moves/{move.name}">{move.label}</a></li>
		{/each}
	</ul>
</section>

<style>
	.relations-panel {
		margin-top: var(--space-5);
		padding-block: var(--space-4);
	}

	.relations {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: var(--space-4) var(--space-7);
		margin: 0;
	}

	.relations > div {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	.relations dt {
		font-weight: var(--weight-semibold);
	}

	.relations dd {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1);
		align-items: center;
		min-height: 1.5rem;
	}

	@media (max-width: 43rem) {
		.relations {
			grid-template-columns: minmax(0, 1fr);
			gap: var(--space-3);
		}
	}
</style>
