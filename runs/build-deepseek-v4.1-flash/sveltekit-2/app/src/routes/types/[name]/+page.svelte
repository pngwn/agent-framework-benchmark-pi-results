<script>
	import PokemonCard from '#lib/components/PokemonCard.svelte';
	import TypeBadge from '#lib/components/TypeBadge.svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>{data.label} – Pokédex</title>
</svelte:head>

<h1>{data.label}</h1>

<section class="panel" aria-labelledby="damage-relations-heading">
	<h2 id="damage-relations-heading">Damage relations</h2>
	<dl class="relations">
		{#each data.relations as relation}
			<div class="relation">
				<dt>{relation.label}</dt>
				<dd>
					{#if relation.types.length === 0}
						None
					{:else}
						{#each relation.types as type}
							<TypeBadge name={type.name} label={type.label} href={`/types/${type.name}`} />
						{/each}
					{/if}
				</dd>
			</div>
		{/each}
	</dl>
</section>

<section class="panel" aria-labelledby="pokemon-heading">
	<h2 id="pokemon-heading">Pokémon</h2>
	<p class="page-count">{data.pokemon.length} Pokémon</p>
	<ul class="card-grid">
		{#each data.pokemon as pokemon (pokemon.id)}
			<PokemonCard {pokemon} />
		{/each}
	</ul>
</section>

<section class="panel" aria-labelledby="moves-heading">
	<h2 id="moves-heading">Moves</h2>
	<p class="page-count">{data.moves.length} moves</p>
	<ul class="moves-list">
		{#each data.moves as move (move.name)}
			<li><a href={`/moves/${move.name}`}>{move.label}</a></li>
		{/each}
	</ul>
</section>

<style>
	.relations {
		display: grid;
		grid-template-columns: 1fr 1fr;
		grid-template-rows: repeat(3, auto);
		grid-auto-flow: column;
		gap: var(--space-4) var(--space-6);
		margin: 0;
	}

	.relation {
		min-width: 0;
	}

	.relation dt {
		margin-bottom: var(--space-2);
		color: var(--color-text-muted);
		font-size: var(--text-sm);
	}

	.relation dd {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1);
		margin: 0;
		font-size: var(--text-sm);
	}

	.moves-list {
		columns: 6;
		column-gap: var(--space-5);
		margin: 0;
		padding: 0;
		list-style: none;
		font-size: var(--text-sm);
		line-height: var(--leading-normal);
	}

	.moves-list li {
		break-inside: avoid;
		margin-bottom: var(--space-1);
	}

	@media (max-width: 48rem) {
		.relations {
			grid-template-columns: 1fr;
			grid-template-rows: none;
			grid-auto-flow: row;
			gap: var(--space-4);
		}

		.moves-list {
			columns: 2;
		}
	}
</style>
