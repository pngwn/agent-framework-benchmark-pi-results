<script>
	import EvolutionNode from '#lib/EvolutionNode.svelte';

	let { node } = $props();
</script>

<li>
	<a href="/pokemon/{node.name}">{node.human}</a>
	{#if node.children.length > 0}
		<ul>
			{#each node.children as child (child.name)}
				<EvolutionNode node={child} />
			{/each}
		</ul>
	{/if}
</li>
