<script>
	import { page } from '$app/state';
</script>

<svelte:head>
	<title>{page.status === 404 ? 'Not found' : 'Error'} – Pokédex</title>
</svelte:head>

{#if page.status === 404}
	<h1>Not found</h1>
	<p><a href="/">Back to the Pokédex</a></p>
{:else}
	<h1>Error</h1>
	<p>Something went wrong.</p>
	<p><a href="/">Back to the Pokédex</a></p>
{/if}
