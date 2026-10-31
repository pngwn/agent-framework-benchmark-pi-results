<script>
	import PokemonCard from '#lib/PokemonCard.svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>{data.name} – Pokédex</title>
</svelte:head>

<h1>{data.name}</h1>

<section class="panel" aria-labelledby="damage-relations-heading">
	<h2 id="damage-relations-heading">Damage relations</h2>
	<dl class="relations">
		{#each data.relations as rel (rel.term)}
			<div>
				<dt>{rel.term}</dt>
				<dd class="rel-types">
					{#if rel.types.length > 0}
						{#each rel.types as t (t.name)}
							<a class="badge type-{t.name}" href="/types/{t.name}">{t.en}</a>
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
	<p class="count">{data.pokemon.length} Pokémon</p>
	<ul class="card-grid">
		{#each data.pokemon as s (s.id)}
			<PokemonCard id={s.id} name={s.name} human={s.human} sprite={s.sprite} />
		{/each}
	</ul>
</section>

<section class="panel" aria-labelledby="moves-heading">
	<h2 id="moves-heading">Moves</h2>
	<p class="count">{data.moves.length} moves</p>
	<ul class="move-list">
		{#each data.moves as m (m.name)}
			<li><a href="/moves/{m.name}">{m.human}</a></li>
		{/each}
	</ul>
</section>
