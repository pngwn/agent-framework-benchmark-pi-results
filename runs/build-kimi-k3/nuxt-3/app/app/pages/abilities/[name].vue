<script setup lang="ts">
const route = useRoute()
const name = String(route.params.name).toLowerCase()

const { data } = await useAsyncData(`ability-${name}`, async () => {
  const ability = await fetchRecord('ability', name)
  if (!ability) return null

  const effectEntry = (ability.effect_entries as { short_effect: string; language: { name: string } }[]).find(
    (e) => e.language.name === 'en',
  )
  const effect = effectEntry ? collapseWhitespace(effectEntry.short_effect) : '—'

  const entries = ability.pokemon as { is_hidden: boolean; pokemon: NamedRef }[]
  const cards = await cardsFromPokemonRefs(
    entries.map((e) => e.pokemon),
    (ref) => entries.find((e) => e.pokemon.url === ref.url)?.is_hidden ?? false,
  )

  return {
    enName: englishName(ability.names, ability.name),
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

    <section class="panel" aria-labelledby="effect-heading">
      <h2 id="effect-heading">Effect</h2>
      <p>{{ data.effect }}</p>
    </section>

    <section class="panel" aria-labelledby="pokemon-heading">
      <h2 id="pokemon-heading">Pokémon</h2>
      <p class="count">{{ data.cards.length }} Pokémon</p>
      <ul class="card-grid">
        <PokemonCard v-for="c in data.cards" :key="c.id" :card="c" />
      </ul>
    </section>
  </template>
</template>
