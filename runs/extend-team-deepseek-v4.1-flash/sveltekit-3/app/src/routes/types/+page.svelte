<script lang="ts">
	import { pageTitle } from '#lib/format.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>{pageTitle('Types')}</title>
</svelte:head>

<h1 class="page-heading">Types</h1>

<ul class="types">
	{#each data.types as type (type.name)}
		<li>
			<a href="/types/{type.name}" style:--type-bg="var(--type-{type.name}, var(--color-text-muted))">{type.label}</a>
		</li>
	{/each}
</ul>

<style>
	.types {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--space-3);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	@media (min-width: 48rem) {
		.types {
			grid-template-columns: repeat(auto-fill, minmax(7.5rem, 1fr));
		}
	}

	a {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 2.5rem;
		border-radius: var(--radius-md);
		background: var(--type-bg);
		color: var(--color-on-type);
		text-decoration: none;
	}

	a:hover {
		text-decoration: underline;
	}
</style>
