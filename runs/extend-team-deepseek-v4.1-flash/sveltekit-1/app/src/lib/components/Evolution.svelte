<script lang="ts">
	import { humanize } from '../format.ts';
	import type { EvolutionNode } from '../types.ts';
	import Evolution from './Evolution.svelte';

	let { nodes }: { nodes: EvolutionNode[] } = $props();
</script>

<ul>
	{#each nodes as node (node.name)}
		<li>
			<a href="/pokemon/{node.name}">{humanize(node.name)}</a>
			{#if node.children.length}
				<Evolution nodes={node.children} />
			{/if}
		</li>
	{/each}
</ul>

<style>
	ul {
		margin: 0;
		padding-left: var(--space-5);
	}

	ul :global(ul) {
		padding-left: var(--space-5);
	}
</style>
