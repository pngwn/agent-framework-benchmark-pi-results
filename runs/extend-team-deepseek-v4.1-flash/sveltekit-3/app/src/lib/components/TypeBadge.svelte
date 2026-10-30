<script lang="ts">
	import type { TypeRef } from '../types.ts';

	let { type, link = false }: { type: TypeRef; link?: boolean } = $props();
</script>

{#if link}
	<a class="badge" href="/types/{type.name}" style:--badge-bg="var(--type-{type.name}, var(--color-text-muted))"
		>{type.label}</a
	>
{:else}
	<span class="badge" style:--badge-bg="var(--type-{type.name}, var(--color-text-muted))">{type.label}</span>
{/if}

<style>
	.badge {
		display: inline-block;
		padding: 0.125rem var(--space-2);
		border-radius: var(--radius-pill);
		background: var(--badge-bg);
		color: var(--color-on-type);
		font-size: var(--text-xs);
		line-height: var(--leading-normal);
		text-decoration: none;
		white-space: nowrap;
	}

	a.badge:hover {
		text-decoration: underline;
	}
</style>
