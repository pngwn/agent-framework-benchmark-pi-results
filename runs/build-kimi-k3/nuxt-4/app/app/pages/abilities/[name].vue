<script setup lang="ts">
import { setResponseStatus } from 'h3'
import { api, collapse, englishName, getIndex, humanize, idFromUrl } from '~/lib/pokeapi'

const route = useRoute()
const base = useApiBase()

async function load(name: string) {
  const ability = await api(base, `/ability/${encodeURIComponent(name)}/`)
  if (!ability) return null
  const index = await getIndex(base)

  const seen = new Set<number>()
  const cards: { id: number; name: string; human: string; hidden: boolean }[] = []
  for (const entry of ability.pokemon ?? []) {
    const species = index.speciesById[idFromUrl(entry.pokemon.url)]
    if (!species || seen.has(species.id)) continue
    seen.add(species.id)
    cards.push({ ...species, hidden: !!entry.is_hidden })
  }
  cards.sort((a, b) => a.id - b.id)

  const shortEffect = (ability.effect_entries ?? []).find((e: any) => e.language.name === 'en')?.short_effect
  return {
    title: englishName(ability.names) ?? humanize(ability.name),
    effect: shortEffect ? collapse(shortEffect) : '—',
    cards,
  }
}

const { data } = await useAsyncData(`ability-${route.params.name}`, () => load(String(route.params.name)), {
  watch: [() => route.params.name],
})

if (!data.value) {
  const event = useRequestEvent()
  if (event) setResponseStatus(event, 404)
}

useHead({
  title: computed(() => (data.value ? `${data.value.title} – Pokédex` : 'Not found – Pokédex')),
})
</script>

<template>
  <NotFound v-if="!data" />
  <div v-else>
    <h1>{{ data.title }}</h1>
    <section class="panel" aria-labelledby="effect-heading">
      <h2 id="effect-heading">Effect</h2>
      <p class="section-text">{{ data.effect }}</p>
    </section>

    <section class="panel" aria-labelledby="pokemon-heading">
      <h2 id="pokemon-heading">Pokémon</h2>
      <p class="result-count">{{ data.cards.length }} Pokémon</p>
      <ul class="card-grid">
        <PokemonCard
          v-for="c in data.cards"
          :key="c.id"
          :id="c.id"
          :name="c.name"
          :human="c.human"
          :hidden="c.hidden"
        />
      </ul>
    </section>
  </div>
</template>
