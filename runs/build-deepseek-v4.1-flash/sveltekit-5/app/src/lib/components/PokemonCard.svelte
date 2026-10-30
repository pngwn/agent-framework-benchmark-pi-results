<script>
	import TypeBadge from './TypeBadge.svelte';

	let { pokemon, showTypes = false, note = '' } = $props();
</script>

<li class="pokemon-card">
	<a class="pokemon-card-link" class:has-types={showTypes && pokemon.types?.length} href="/pokemon/{pokemon.name}">
		<img src={pokemon.sprite} alt="" width="96" height="96" decoding="async" />
		<span class="dex-number">#{String(pokemon.id).padStart(4, '0')}</span>
		<span class="pokemon-name">{pokemon.humanName}</span>
		{#if showTypes && pokemon.types?.length}
			<span class="card-types">
				{#each pokemon.types as type}
					<TypeBadge name={type.name} englishName={type.englishName} />
				{/each}
			</span>
		{/if}
		{#if note}
			<span class="card-note">{note}</span>
		{/if}
	</a>
</li>
