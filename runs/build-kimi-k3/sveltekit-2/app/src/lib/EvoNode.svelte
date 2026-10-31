<script>
  import EvoNode from './EvoNode.svelte';

  let { node } = $props();
</script>

<li>
  <a href="/pokemon/{node.name}">{node.label}</a>
  {#if node.children.length}
    <ul>
      {#each node.children as child (child.name)}
        <EvoNode node={child} />
      {/each}
    </ul>
  {/if}
</li>
