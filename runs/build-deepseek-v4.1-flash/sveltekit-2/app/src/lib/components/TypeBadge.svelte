<script>
	let { name, label, href = null } = $props();
</script>

{#if href}
	<a class="tag type-{name}" {href}>{label}</a>
{:else}
	<span class="tag type-{name}">{label}</span>
{/if}
