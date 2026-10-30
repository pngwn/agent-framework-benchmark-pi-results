<script lang="ts">
	import { dexNumber, humanize } from '../format.ts';
	import type { Card } from '../types.ts';
	import TypeBadge from './TypeBadge.svelte';

	let { card, showTypes = false }: { card: Card; showTypes?: boolean } = $props();
</script>

<a class="card" href="/pokemon/{card.name}">
	<img src={card.sprite} alt="" width="96" height="96" loading="lazy" />
	<span class="dex">{dexNumber(card.id)}</span>
	<span class="name">{humanize(card.name)}</span>
	{#if showTypes && card.types?.length}
		<span class="types">
			{#each card.types as type (type.name)}
				<TypeBadge {type} />
			{/each}
		</span>
	{/if}
	{#if card.hidden}
		<span class="hidden">Hidden ability</span>
	{/if}
</a>

<style>
	.card {
		display: flex;
		flex-direction: column;
		align-items: center;
		height: 100%;
		padding: var(--space-3);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		color: var(--color-text);
		text-decoration: none;
		text-align: center;
	}

	.card:hover {
		border-color: var(--color-link);
	}

	.card:hover .name {
		text-decoration: underline;
	}

	img {
		width: var(--sprite-size);
		height: var(--sprite-size);
		image-rendering: pixelated;
		margin-bottom: var(--space-1);
	}

	.dex {
		color: var(--color-text-muted);
		font-size: var(--text-xs);
	}

	.name {
		margin-top: var(--space-1);
		line-height: var(--leading-tight);
	}

	.types {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: var(--space-1);
		margin-top: var(--space-2);
	}

	.hidden {
		margin-top: var(--space-2);
		color: var(--color-text-muted);
		font-size: var(--text-xs);
	}
</style>
