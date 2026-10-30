<script>
	import TypeBadge from './TypeBadge.svelte';
	import { dexNumber } from '#lib/format.js';

	let { pokemon, types = [], hidden = false } = $props();
</script>

<li class="card">
	<a href="/pokemon/{pokemon.name}">
		<img class="card-sprite" src={pokemon.sprite} alt="" width="96" height="96" loading="lazy" />
		<span class="card-number">{dexNumber(pokemon.id)}</span>
		<span class="card-name">{pokemon.displayName}</span>
		{#if types.length}
			<span class="card-types">
				{#each types as type (type.name)}
					<TypeBadge name={type.name} label={type.label} />
				{/each}
			</span>
		{/if}
	</a>
	{#if hidden}
		<span class="card-hidden">Hidden ability</span>
	{/if}
</li>
