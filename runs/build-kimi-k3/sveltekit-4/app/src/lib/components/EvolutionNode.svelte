<script>
	import Self from './EvolutionNode.svelte';

	/** One species in an evolution chain, with its evolutions nested inside. */
	let { node } = $props();
</script>

<li>
	<a href="/pokemon/{node.name}">{node.label}</a>
	{#if node.children.length}
		<ul>
			{#each node.children as child (child.name)}
				<Self node={child} />
			{/each}
		</ul>
	{/if}
</li>
