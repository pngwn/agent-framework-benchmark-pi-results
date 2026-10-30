<script>
	import PokemonCard from '#lib/components/PokemonCard.svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>{data.title}</title>
</svelte:head>

<h1 class="page-title">{data.type.displayName}</h1>

<section class="panel" aria-labelledby="relations-heading">
	<h2 id="relations-heading">Damage relations</h2>
	<dl class="relations">
		{#each data.type.relations as relation (relation.label)}
			<div class="relation">
				<dt>{relation.label}</dt>
				<dd>
					{#if relation.types.length}
						{#each relation.types as type (type.name)}
							<a class={`type-badge type-${type.name}`} href={`/types/${type.name}`}>{type.display}</a>
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
	<p class="section-intro">{data.cards.length} Pokémon</p>
	<ul class="card-grid">
		{#each data.cards as pokemon (pokemon.id)}
			<PokemonCard {pokemon} />
		{/each}
	</ul>
</section>

<section class="panel" aria-labelledby="moves-heading">
	<h2 id="moves-heading">Moves</h2>
	<p class="section-intro">{data.moves.length} moves</p>
	<ul class="move-list">
		{#each data.moves as move (move.name)}
			<li><a href={`/moves/${move.name}`}>{move.display}</a></li>
		{/each}
	</ul>
</section>
