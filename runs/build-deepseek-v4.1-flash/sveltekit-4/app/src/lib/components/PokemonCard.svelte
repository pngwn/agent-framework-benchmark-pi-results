<script>
	import { dexNumber, humanize } from '#lib/format';

	let { pokemon, showTypes = false, hidden = false } = $props();
</script>

<li class="pokemon-card">
	<a href={`/pokemon/${pokemon.speciesName}`}>
		<img src={pokemon.sprite} alt="" width="96" height="96" loading="lazy" />
		<p class="dex-number">{dexNumber(pokemon.id)}</p>
		<p class="pokemon-name">{humanize(pokemon.speciesName)}</p>
		{#if showTypes && pokemon.types?.length}
			<span class="card-types">
				{#each pokemon.types as type (type.name)}
					<span class={`type-badge type-${type.name}`}>{type.englishName}</span>
				{/each}
			</span>
		{/if}
	</a>
	{#if hidden}
		<p class="hidden-ability">Hidden ability</p>
	{/if}
</li>
