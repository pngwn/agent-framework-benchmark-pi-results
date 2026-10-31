<script>
	import Section from '../../../lib/components/Section.svelte';
	import CardGrid from '../../../lib/components/CardGrid.svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>{data.name} – Pokédex</title>
</svelte:head>

<h1>{data.name}</h1>

<div class="facts card">
	<dl>
		<div>
			<dt>Type</dt>
			<dd>
				{#if data.type}
					<a class="pill" style:--pill-bg="var(--type-{data.type.name}, var(--color-border))" href="/types/{data.type.name}">
						{data.type.label}
					</a>
				{:else}
					—
				{/if}
			</dd>
		</div>
		<div>
			<dt>Category</dt>
			<dd>{data.category}</dd>
		</div>
		<div>
			<dt>Power</dt>
			<dd>{data.power ?? '—'}</dd>
		</div>
		<div>
			<dt>Accuracy</dt>
			<dd>{data.accuracy ?? '—'}</dd>
		</div>
		<div>
			<dt>PP</dt>
			<dd>{data.pp ?? '—'}</dd>
		</div>
	</dl>
</div>

<Section id="effect" title="Effect">
	<p>{data.shortEffect}</p>
</Section>

<Section id="learned-by" title="Learned by">
	<p class="count muted">{data.learnedBy.length} Pokémon</p>
	<CardGrid cards={data.learnedBy} />
</Section>

<style>
	.facts {
		margin-bottom: var(--space-5);
	}

	.facts dl {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-4) var(--space-7);
	}

	.facts dt {
		font-size: var(--text-sm);
		color: var(--color-text-muted);
	}

	.count {
		font-size: var(--text-sm);
		margin-bottom: var(--space-4);
	}
</style>
