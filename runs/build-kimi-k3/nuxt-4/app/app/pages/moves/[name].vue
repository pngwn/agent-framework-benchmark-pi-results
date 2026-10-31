<script setup lang="ts">
import { setResponseStatus } from 'h3'
import { api, collapse, englishName, getIndex, humanize, latestEnFlavor, speciesCardsForRefs } from '~/lib/pokeapi'

const route = useRoute()
const base = useApiBase()

async function load(name: string) {
  const move = await api(base, `/move/${encodeURIComponent(name)}/`)
  if (!move) return null
  const index = await getIndex(base)
  const effectEntry = (move.effect_entries ?? []).find((e: any) => e.language.name === 'en')?.short_effect
  const effect = effectEntry ? collapse(effectEntry) : (latestEnFlavor(move.flavor_text_entries) ?? '—')
  return {
    title: englishName(move.names) ?? humanize(move.name),
    type: move.type ? { name: move.type.name, english: humanize(move.type.name) } : null,
    category: move.damage_class?.name ? humanize(move.damage_class.name) : '—',
    power: move.power ?? null,
    accuracy: move.accuracy ?? null,
    pp: move.pp ?? null,
    effect,
    cards: speciesCardsForRefs(index, move.learned_by_pokemon ?? []),
  }
}

const { data } = await useAsyncData(`move-${route.params.name}`, () => load(String(route.params.name)), {
  watch: [() => route.params.name],
})

if (!data.value) {
  const event = useRequestEvent()
  if (event) setResponseStatus(event, 404)
}

useHead({
  title: computed(() => (data.value ? `${data.value.title} – Pokédex` : 'Not found – Pokédex')),
})

const show = (v: number | null | undefined) => (v === null || v === undefined ? '—' : v)
</script>

<template>
  <NotFound v-if="!data" />
  <div v-else>
    <h1>{{ data.title }}</h1>
    <div class="panel">
      <dl class="detail-list">
        <div v-if="data.type">
          <dt>Type</dt>
          <dd>
            <NuxtLink
              :to="`/types/${data.type.name}`"
              class="badge"
              :style="{ backgroundColor: `var(--type-${data.type.name})` }"
            >
              {{ data.type.english }}
            </NuxtLink>
          </dd>
        </div>
        <div>
          <dt>Category</dt>
          <dd>{{ data.category }}</dd>
        </div>
        <div>
          <dt>Power</dt>
          <dd>{{ show(data.power) }}</dd>
        </div>
        <div>
          <dt>Accuracy</dt>
          <dd>{{ show(data.accuracy) }}</dd>
        </div>
        <div>
          <dt>PP</dt>
          <dd>{{ show(data.pp) }}</dd>
        </div>
      </dl>
    </div>

    <section class="panel" aria-labelledby="effect-heading">
      <h2 id="effect-heading">Effect</h2>
      <p class="section-text">{{ data.effect }}</p>
    </section>

    <section class="panel" aria-labelledby="learned-heading">
      <h2 id="learned-heading">Learned by</h2>
      <p class="result-count">{{ data.cards.length }} Pokémon</p>
      <ul class="card-grid">
        <PokemonCard v-for="c in data.cards" :key="c.id" :id="c.id" :name="c.name" :human="c.human" />
      </ul>
    </section>
  </div>
</template>
