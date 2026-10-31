<script setup lang="ts">
const route = useRoute()
const name = String(route.params.name).toLowerCase()

const RELATIONS: { key: string; label: string }[] = [
  { key: 'double_damage_to', label: 'Super effective against' },
  { key: 'half_damage_to', label: 'Not very effective against' },
  { key: 'no_damage_to', label: 'No effect against' },
  { key: 'double_damage_from', label: 'Weak to' },
  { key: 'half_damage_from', label: 'Resists' },
  { key: 'no_damage_from', label: 'Immune to' },
]

const { data } = await useAsyncData(`type-${name}`, async () => {
  if (EXCLUDED_TYPES.has(name)) return null
  const type = await fetchRecord('type', name)
  if (!type) return null

  const typeIndex = await getTypeIndex()
  const enOf = (n: string) => typeIndex.enByName.get(n) ?? humanize(n)

  const relations = RELATIONS.map(({ key, label }) => ({
    label,
    types: ((type.damage_relations[key] ?? []) as NamedRef[]).map((t) => ({ name: t.name, en: enOf(t.name) })),
  }))

  const cards = await cardsFromPokemonRefs((type.pokemon as { pokemon: NamedRef }[]).map((p) => p.pokemon))

  const moves = (type.moves as NamedRef[])
    .map((m) => ({ name: m.name, label: humanize(m.name) }))
    .sort((a, b) => a.label.localeCompare(b.label))

  return {
    enName: englishName(type.names, type.name),
    relations,
    cards,
    moves,
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

    <section class="panel" aria-labelledby="relations-heading">
      <h2 id="relations-heading">Damage relations</h2>
      <dl class="relations">
        <div v-for="rel in data.relations" :key="rel.label">
          <dt>{{ rel.label }}</dt>
          <dd v-if="rel.types.length">
            <NuxtLink
              v-for="t in rel.types"
              :key="t.name"
              :to="`/types/${t.name}`"
              class="type-badge"
              :class="`type-${t.name}`"
            >
              {{ t.en }}
            </NuxtLink>
          </dd>
          <dd v-else>None</dd>
        </div>
      </dl>
    </section>

    <section class="panel" aria-labelledby="pokemon-heading">
      <h2 id="pokemon-heading">Pokémon</h2>
      <p class="count">{{ data.cards.length }} Pokémon</p>
      <ul class="card-grid">
        <PokemonCard v-for="c in data.cards" :key="c.id" :card="c" />
      </ul>
    </section>

    <section class="panel" aria-labelledby="moves-heading">
      <h2 id="moves-heading">Moves</h2>
      <p class="count">{{ data.moves.length }} moves</p>
      <ul class="move-list">
        <li v-for="m in data.moves" :key="m.name">
          <NuxtLink :to="`/moves/${m.name}`">{{ m.label }}</NuxtLink>
        </li>
      </ul>
    </section>
  </template>
</template>
