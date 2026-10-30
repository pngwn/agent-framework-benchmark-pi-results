<script>
	let { name, englishName = name, link = false, tile = false } = $props();
</script>

{#if link}
	<a class="type-badge type-{name}" class:type-tile={tile} href="/types/{name}">{englishName}</a>
{:else}
	<span class="type-badge type-{name}" class:type-tile={tile}>{englishName}</span>
{/if}

<style>
	.type-tile {
		min-height: 2.25rem;
		border-radius: var(--radius-sm);
		font-size: var(--text-base);
		font-weight: var(--weight-normal);
		padding: var(--space-1) var(--space-3);
	}
</style>
