<script>
	import { dexNumber } from '#lib/format.js';
	import TypeBadge from './TypeBadge.svelte';

	let { pokemon, showTypes = false, note = null } = $props();
</script>

<li class="pokemon-card">
	<a class="card-link" href={`/pokemon/${pokemon.name}`}>
		<img class="sprite" src={pokemon.sprite} alt="" width="96" height="96" />
		<span class="dex">{dexNumber(pokemon.id)}</span>
		<span class="name">{pokemon.label}</span>
	</a>
	{#if showTypes && pokemon.types?.length}
		<span class="types">
			{#each pokemon.types as type}
				<TypeBadge name={type.name} label={type.label} />
			{/each}
		</span>
	{/if}
	{#if note}
		<span class="note">{note}</span>
	{/if}
</li>

<style>
	.pokemon-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: flex-start;
		padding: var(--space-4);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		text-align: center;
	}

	.card-link {
		display: flex;
		flex-direction: column;
		align-items: center;
		color: var(--color-text);
		text-decoration: none;
	}

	.sprite {
		width: var(--sprite-size);
		height: var(--sprite-size);
		object-fit: contain;
		image-rendering: auto;
	}

	.dex {
		margin-top: var(--space-2);
		color: var(--color-text-muted);
		font-size: var(--text-xs);
	}

	.name {
		font-size: var(--text-base);
		line-height: var(--leading-tight);
	}

	.types {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: var(--space-1);
		margin-top: var(--space-1);
	}

	.note {
		margin-top: var(--space-1);
		color: var(--color-text-muted);
		font-size: var(--text-xs);
		line-height: var(--leading-tight);
	}
</style>
