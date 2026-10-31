<script>
	import Section from '../../../lib/components/Section.svelte';
	import CardGrid from '../../../lib/components/CardGrid.svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>{data.name} – Pokédex</title>
</svelte:head>

<h1>{data.name}</h1>

<Section id="damage-relations" title="Damage relations">
	<dl class="relations">
		{#each data.relations as relation (relation.term)}
			<div class="relation">
				<dt>{relation.term}</dt>
				<dd>
					{#if relation.types.length}
						{#each relation.types as type (type.name)}
							<a class="pill" style:--pill-bg="var(--type-{type.name}, var(--color-border))" href="/types/{type.name}">
								{type.label}
							</a>
						{/each}
					{:else}
						None
					{/if}
				</dd>
			</div>
		{/each}
	</dl>
</Section>

<Section id="pokemon" title="Pokémon">
	<p class="count muted">{data.pokemon.length} Pokémon</p>
	<CardGrid cards={data.pokemon} />
</Section>

<Section id="moves" title="Moves">
	<p class="count muted">{data.moves.length} moves</p>
	<ul class="move-list">
		{#each data.moves as move (move.name)}
			<li><a href="/moves/{move.name}">{move.label}</a></li>
		{/each}
	</ul>
</Section>

<style>
	.relations {
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--space-4);
	}

	@media (min-width: 48rem) {
		.relations {
			grid-template-columns: 1fr 1fr;
		}
	}

	.relation dt {
		font-size: var(--text-sm);
		color: var(--color-text-muted);
		margin-bottom: var(--space-1);
	}

	.relation dd {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
	}

	.count {
		font-size: var(--text-sm);
		margin-bottom: var(--space-4);
	}

	.move-list {
		list-style: none;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(9rem, 1fr));
		gap: var(--space-2) var(--space-4);
		font-size: var(--text-sm);
	}
</style>
