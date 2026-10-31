<script setup lang="ts">
import { setResponseStatus } from 'h3'
import { EXCLUDED_TYPES, api, englishName, getIndex, humanize, speciesCardsForRefs } from '~/lib/pokeapi'

const RELATIONS: [string, string][] = [
  ['Super effective against', 'double_damage_to'],
  ['Not very effective against', 'half_damage_to'],
  ['No effect against', 'no_damage_to'],
  ['Weak to', 'double_damage_from'],
  ['Resists', 'half_damage_from'],
  ['Immune to', 'no_damage_from'],
]

const route = useRoute()
const base = useApiBase()

async function load(name: string) {
  if (EXCLUDED_TYPES.has(name)) return null
  const type = await api(base, `/type/${encodeURIComponent(name)}/`)
  if (!type) return null
  const index = await getIndex(base)
  const relations = RELATIONS.map(([label, key]) => ({
    label,
    types: (type.damage_relations?.[key] ?? []).map((r: any) => ({
      name: r.name,
      english: index.typeEnglish[r.name] ?? humanize(r.name),
    })),
  }))
  const moves = (type.moves ?? [])
    .map((m: any) => ({ name: m.name, human: humanize(m.name) }))
    .sort((a: any, b: any) => a.human.localeCompare(b.human))
  return {
    title: englishName(type.names) ?? humanize(type.name),
    relations,
    cards: speciesCardsForRefs(index, (type.pokemon ?? []).map((p: any) => p.pokemon)),
    moves,
  }
}

const { data } = await useAsyncData(`type-${route.params.name}`, () => load(String(route.params.name)), {
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

    <section class="panel" aria-labelledby="relations-heading">
      <h2 id="relations-heading">Damage relations</h2>
      <dl class="relations">
        <div v-for="rel in data.relations" :key="rel.label">
          <dt>{{ rel.label }}</dt>
          <dd v-if="rel.types.length" class="badges relation-badges">
            <NuxtLink
              v-for="t in rel.types"
              :key="t.name"
              :to="`/types/${t.name}`"
              class="badge"
              :style="{ backgroundColor: `var(--type-${t.name}, var(--color-text-muted))` }"
            >
              {{ t.english }}
            </NuxtLink>
          </dd>
          <dd v-else>None</dd>
        </div>
      </dl>
    </section>

    <section class="panel" aria-labelledby="pokemon-heading">
      <h2 id="pokemon-heading">Pokémon</h2>
      <p class="result-count">{{ data.cards.length }} Pokémon</p>
      <ul class="card-grid">
        <PokemonCard v-for="c in data.cards" :key="c.id" :id="c.id" :name="c.name" :human="c.human" />
      </ul>
    </section>

    <section class="panel" aria-labelledby="moves-heading">
      <h2 id="moves-heading">Moves</h2>
      <p class="result-count">{{ data.moves.length }} moves</p>
      <ul class="moves-list">
        <li v-for="m in data.moves" :key="m.name">
          <NuxtLink :to="`/moves/${m.name}`">{{ m.human }}</NuxtLink>
        </li>
      </ul>
    </section>
  </div>
</template>
