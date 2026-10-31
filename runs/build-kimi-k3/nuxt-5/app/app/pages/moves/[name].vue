<script setup>
const route = useRoute()
const name = String(route.params.name)

const { data } = await useAsyncData(`move:${name}`, async () => {
  let move
  try {
    move = await fetchApi(`/api/v2/move/${encodeURIComponent(name)}/`)
  } catch {
    return null
  }
  const [species, typeIndex] = await Promise.all([getSpeciesList(), getTypeIndex()])
  const learned = mapPokemonToSpecies(move.learned_by_pokemon ?? [], species).map(({ id, name: sname }) => ({
    id,
    name: sname,
  }))
  const effect = enShortEffect(move) || latestEnFlavorText(move.flavor_text_entries) || '—'
  return {
    enName: enName(move),
    type: move.type?.name ?? '',
    typeEn: move.type?.name ? typeEnName(typeIndex, move.type.name) : '—',
    category: move.damage_class?.name ? humanize(move.damage_class.name) : '—',
    power: move.power ?? null,
    accuracy: move.accuracy ?? null,
    pp: move.pp ?? null,
    effect,
    learned,
  }
})

if (!data.value) setResponseStatus(404)

useHead({
  title: computed(() => (data.value ? `${data.value.enName} – Pokédex` : 'Not found – Pokédex')),
})
</script>

<template>
  <NotFound v-if="!data" />
  <div v-else>
    <h1>{{ data.enName }}</h1>

    <div class="surface">
      <dl class="facts">
        <div class="fact">
          <dt>Type</dt>
          <dd>
            <TypeBadge v-if="data.type" :name="data.type" :label="data.typeEn" />
            <template v-else>—</template>
          </dd>
        </div>
        <div class="fact">
          <dt>Category</dt>
          <dd>{{ data.category }}</dd>
        </div>
        <div class="fact">
          <dt>Power</dt>
          <dd>{{ data.power ?? '—' }}</dd>
        </div>
        <div class="fact">
          <dt>Accuracy</dt>
          <dd>{{ data.accuracy ?? '—' }}</dd>
        </div>
        <div class="fact">
          <dt>PP</dt>
          <dd>{{ data.pp ?? '—' }}</dd>
        </div>
      </dl>
    </div>

    <section class="surface" aria-labelledby="effect-heading">
      <h2 id="effect-heading">Effect</h2>
      <p>{{ data.effect }}</p>
    </section>

    <section class="surface" aria-labelledby="learned-by-heading">
      <h2 id="learned-by-heading">Learned by</h2>
      <p class="result-count">{{ data.learned.length }} Pokémon</p>
      <ul class="card-grid">
        <PokemonCard v-for="s in data.learned" :key="s.id" :id="s.id" :name="s.name" />
      </ul>
    </section>
  </div>
</template>
