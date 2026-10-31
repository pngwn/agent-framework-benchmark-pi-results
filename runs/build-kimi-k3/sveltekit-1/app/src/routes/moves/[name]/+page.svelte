<script>
	import PokemonCard from '#lib/PokemonCard.svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>{data.name} – Pokédex</title>
</svelte:head>

<h1>{data.name}</h1>

<div class="panel">
	<dl class="fact-list">
		<div>
			<dt>Type</dt>
			<dd><a class="badge type-{data.type.name}" href="/types/{data.type.name}">{data.type.en}</a></dd>
		</div>
		<div>
			<dt>Category</dt>
			<dd>{data.category}</dd>
		</div>
		<div>
			<dt>Power</dt>
			<dd>{data.power ?? '—'}</dd>
		</div>
		<div>
			<dt>Accuracy</dt>
			<dd>{data.accuracy ?? '—'}</dd>
		</div>
		<div>
			<dt>PP</dt>
			<dd>{data.pp ?? '—'}</dd>
		</div>
	</dl>
</div>

<section class="panel" aria-labelledby="effect-heading">
	<h2 id="effect-heading">Effect</h2>
	<p>{data.effect}</p>
</section>

<section class="panel" aria-labelledby="learned-by-heading">
	<h2 id="learned-by-heading">Learned by</h2>
	<p class="count">{data.pokemon.length} Pokémon</p>
	<ul class="card-grid">
		{#each data.pokemon as s (s.id)}
			<PokemonCard id={s.id} name={s.name} human={s.human} sprite={s.sprite} />
		{/each}
	</ul>
</section>
