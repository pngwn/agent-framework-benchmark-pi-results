<script>
	import { dexNumber } from '../utils.js';

	/**
	 * A Pokémon card: link to the species page with front sprite,
	 * dex number and humanized species name.
	 */
	let { id, name, label, sprite, types = null, hidden = false } = $props();
</script>

<a class="pokemon-card" href="/pokemon/{name}">
	<img src={sprite} alt="" width="96" height="96" loading="lazy" />
	<span class="dex">{dexNumber(id)}</span>
	<span class="name">{label}</span>
	{#if types}
		<span class="badges">
			{#each types as type (type.name)}
				<span class="pill" style:--pill-bg="var(--type-{type.name}, var(--color-border))">
					{type.label}
				</span>
			{/each}
		</span>
	{/if}
	{#if hidden}
		<span class="hidden-note">Hidden ability</span>
	{/if}
</a>
