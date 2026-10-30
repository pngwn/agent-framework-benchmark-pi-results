<script>
	let { name, label, href = null } = $props();
</script>

{#if href}
	<a class="type-badge type-{name}" {href}>{label}</a>
{:else}
	<span class="type-badge type-{name}">{label}</span>
{/if}
