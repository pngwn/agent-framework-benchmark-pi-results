<script setup lang="ts">
const route = useRoute()
const name = String(route.params.name).toLowerCase()

const { data } = await useAsyncData(`move-${name}`, async () => {
  const move = await fetchRecord('move', name)
  if (!move) return null

  const typeIndex = await getTypeIndex()
  const effectEntry = (move.effect_entries as { short_effect: string; language: { name: string } }[]).find(
    (e) => e.language.name === 'en',
  )
  const effect = effectEntry
    ? collapseWhitespace(effectEntry.short_effect)
    : (latestEnglishFlavorText(move.flavor_text_entries) ?? '—')

  const cards = await cardsFromPokemonRefs(move.learned_by_pokemon as NamedRef[])

  return {
    enName: englishName(move.names, move.name),
    typeName: move.type?.name ?? '',
    typeEn: move.type?.name ? (typeIndex.enByName.get(move.type.name) ?? humanize(move.type.name)) : '',
    category: move.damage_class?.name ? humanize(move.damage_class.name) : '—',
    power: move.power ?? null,
    accuracy: move.accuracy ?? null,
    pp: move.pp ?? null,
    effect,
    cards,
  }
})

useHead({
  title: computed(() => (data.value ? `${data.value.enName} – Pokédex` : 'Not found – Pokédex')),
})

const event = useRequestEvent()
if (event && !data.value) event.node.res.statusCode = 404
</script>

<template>
  <NotFound v-if="!data" />
  <template v-else>
    <h1>{{ data.enName }}</h1>

    <div class="panel">
      <dl class="facts">
        <div>
          <dt>Type</dt>
          <dd>
            <NuxtLink :to="`/types/${data.typeName}`" class="type-badge" :class="`type-${data.typeName}`">
              {{ data.typeEn }}
            </NuxtLink>
          </dd>
        </div>
        <div>
          <dt>Category</dt>
          <dd>{{ data.category }}</dd>
        </div>
        <div>
          <dt>Power</dt>
          <dd>{{ data.power ?? '—' }}</dd>
        </div>
        <div>
          <dt>Accuracy</dt>
          <dd>{{ data.accuracy ?? '—' }}</dd>
        </div>
        <div>
          <dt>PP</dt>
          <dd>{{ data.pp ?? '—' }}</dd>
        </div>
      </dl>
    </div>

    <section class="panel" aria-labelledby="effect-heading">
      <h2 id="effect-heading">Effect</h2>
      <p>{{ data.effect }}</p>
    </section>

    <section class="panel" aria-labelledby="learned-by-heading">
      <h2 id="learned-by-heading">Learned by</h2>
      <p class="count">{{ data.cards.length }} Pokémon</p>
      <ul class="card-grid">
        <PokemonCard v-for="c in data.cards" :key="c.id" :card="c" />
      </ul>
    </section>
  </template>
</template>
