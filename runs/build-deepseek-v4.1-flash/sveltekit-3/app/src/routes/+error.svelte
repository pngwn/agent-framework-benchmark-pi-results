<script>
	import { page } from '$app/state';

	const notFound = $derived(page.status === 404);
	const title = $derived(notFound ? 'Not found' : 'Something went wrong');
</script>

<svelte:head>
	<title>{title} – Pokédex</title>
</svelte:head>

<h1>{title}</h1>
<a class="not-found-link" href="/">Back to the Pokédex</a>
