<script lang="ts">
	import CardList from '#lib/components/CardList.svelte';
	import Section from '#lib/components/Section.svelte';
	import TypeBadge from '#lib/components/TypeBadge.svelte';
	import { pageTitle } from '#lib/format.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const type = $derived(data.type);
</script>

<svelte:head>
	<title>{pageTitle(type.label)}</title>
</svelte:head>

<h1 class="page-heading spacious">{type.label}</h1>

<div class="stack">
	<Section title="Damage relations">
		<dl class="relations">
			{#each type.relations as relation (relation.label)}
				<div>
					<dt>{relation.label}</dt>
					<dd>
						{#if relation.types.length}
							<ul>
								{#each relation.types as related (related.name)}
									<li><TypeBadge type={related} link /></li>
								{/each}
							</ul>
						{:else}
							None
						{/if}
					</dd>
				</div>
			{/each}
		</dl>
	</Section>

	<Section title="Pokémon">
		<p class="muted count">{type.pokemon.length} Pokémon</p>
		<CardList cards={type.pokemon} />
	</Section>

	<Section title="Moves">
		<p class="muted count">{type.moves.length} moves</p>
		<ul class="moves">
			{#each type.moves as move (move.name)}
				<li><a href="/moves/{move.name}">{move.label}</a></li>
			{/each}
		</ul>
	</Section>
</div>

<style>
	.relations {
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--space-3);
		margin: 0;
	}

	@media (min-width: 48rem) {
		.relations {
			grid-template-columns: 1fr 1fr;
		}
	}

	dt {
		color: var(--color-text-muted);
		font-size: var(--text-sm);
		margin-bottom: var(--space-1);
	}

	dd {
		margin: 0;
	}

	dd ul {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.count {
		margin-bottom: var(--space-3);
	}

	.moves {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr));
		gap: var(--space-2) var(--space-5);
		margin: 0;
		padding: 0;
		list-style: none;
		font-size: var(--text-sm);
	}
</style>
