<script lang="ts">
	import { page } from '$app/state';
	import { pageTitle } from '#lib/format.ts';

	const heading = $derived(page.status === 404 ? 'Not found' : 'Something went wrong');
</script>

<svelte:head>
	<title>{pageTitle(heading)}</title>
</svelte:head>

<h1 class="page-heading">{heading}</h1>

{#if page.status !== 404}
	<p class="message">The Pokédex couldn't load this page. Please try again in a moment.</p>
{/if}

<p><a href="/">Back to the Pokédex</a></p>

<style>
	.message {
		margin-bottom: var(--space-4);
	}
</style>
