<script>
	import { dexNumber } from '#lib/format.js';

	let { id, name, human, sprite, types = [], hidden = false } = $props();
</script>

<li class="card">
	<a href="/pokemon/{name}">
		<img src={sprite} alt="" width="96" height="96" loading="lazy" />
		<span class="dex">{dexNumber(id)}</span>
		<span class="card-name">{human}</span>
		{#if types.length > 0}
			<span class="badges">
				{#each types as t (t.name)}
					<span class="badge type-{t.name}">{t.en}</span>
				{/each}
			</span>
		{/if}
		{#if hidden}
			<span class="hidden-ability">Hidden ability</span>
		{/if}
	</a>
</li>
