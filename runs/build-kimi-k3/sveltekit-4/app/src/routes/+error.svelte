<script>
	import { page } from '$app/state';

	let isNotFound = $derived(page.status === 404);
</script>

<svelte:head>
	<title>{isNotFound ? 'Not found' : 'Error'} – Pokédex</title>
</svelte:head>

<h1>{isNotFound ? 'Not found' : 'Something went wrong'}</h1>
<p><a href="/">Back to the Pokédex</a></p>
