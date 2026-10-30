<script>
	import { humanize } from '#lib/format.js';

	let { chain } = $props();
</script>

{#snippet evolutionNode(node)}
	<li>
		<a href="/pokemon/{node.species.name}">{humanize(node.species.name)}</a>
		{#if node.evolves_to?.length}
			<ul>
				{#each node.evolves_to as child}
					{@render evolutionNode(child)}
				{/each}
			</ul>
		{/if}
	</li>
{/snippet}

<ul class="evolution-list">
	{@render evolutionNode(chain)}
</ul>

<style>
	.evolution-list,
	.evolution-list ul {
		margin: 0;
		padding-left: var(--space-5);
	}

	.evolution-list {
		padding-left: 0;
		list-style: disc;
	}


	a {
		color: var(--color-text);
	}
</style>
