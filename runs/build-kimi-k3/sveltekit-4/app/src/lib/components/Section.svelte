<script>
	let { id, title, children } = $props();
</script>

<section class="card" {id} aria-labelledby="{id}-heading">
	<h2 id="{id}-heading">{title}</h2>
	{@render children()}
</section>
