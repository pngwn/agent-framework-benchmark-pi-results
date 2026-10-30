<script>
	import TypeBadge from '#lib/components/TypeBadge.svelte';
	import PokemonCard from '#lib/components/PokemonCard.svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>{data.label} – Pokédex</title>
</svelte:head>

<h1>{data.label}</h1>

<section class="panel" aria-labelledby="damage-relations-heading">
	<h2 id="damage-relations-heading">Damage relations</h2>
	<dl class="damage-relations">
		{#each data.relations as relation (relation.term)}
			<div>
				<dt>{relation.term}</dt>
				<dd>
					{#if relation.types.length}
						{#each relation.types as type (type.name)}
							<TypeBadge name={type.name} label={type.label} href="/types/{type.name}" />
						{/each}
					{:else}
						None
					{/if}
				</dd>
			</div>
		{/each}
	</dl>
</section>

<section class="panel" aria-labelledby="type-pokemon-heading">
	<h2 id="type-pokemon-heading">Pokémon</h2>
	<p class="count">{data.pokemon.length} Pokémon</p>
	<ul class="cards">
		{#each data.pokemon as pokemon (pokemon.id)}
			<PokemonCard {pokemon} />
		{/each}
	</ul>
</section>

<section class="panel" aria-labelledby="type-moves-heading">
	<h2 id="type-moves-heading">Moves</h2>
	<p class="count">{data.moves.length} moves</p>
	<ul class="move-list">
		{#each data.moves as move (move.name)}
			<li><a href="/moves/{move.name}">{move.label}</a></li>
		{/each}
	</ul>
</section>

<style>
	.count {
		margin-bottom: 0;
	}

	.move-list {
		list-style: none;
		columns: 2;
		column-gap: var(--space-5);
		margin-top: var(--space-4);
		font-size: var(--text-sm);
	}

	.move-list li {
		break-inside: avoid;
		margin-bottom: var(--space-1);
	}

	@media (min-width: 48rem) {
		.move-list {
			columns: 4;
		}
	}

	@media (min-width: 64rem) {
		.move-list {
			columns: 6;
		}
	}
</style>
