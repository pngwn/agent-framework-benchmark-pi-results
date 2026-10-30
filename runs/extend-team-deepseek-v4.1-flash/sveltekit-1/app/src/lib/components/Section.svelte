<script lang="ts">
	import type { Snippet } from 'svelte';

	let { title, id, children }: { title: string; id?: string; children: Snippet } = $props();

	const headingId = $derived(`${id ?? title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-heading`);
</script>

<section class="panel" {id} aria-labelledby={headingId}>
	<h2 id={headingId}>{title}</h2>
	{@render children()}
</section>

<style>
	section {
		scroll-margin-top: 0;
	}
</style>
