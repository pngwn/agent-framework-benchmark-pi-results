<script setup>
const route = useRoute()
const name = String(route.params.name)

const { data } = await useAsyncData(`type:${name}`, async () => {
  let type
  try {
    type = await fetchApi(`/api/v2/type/${encodeURIComponent(name)}/`)
  } catch {
    return null
  }
  const [species, typeIndex] = await Promise.all([getSpeciesList(), getTypeIndex()])

  const mons = mapPokemonToSpecies(type.pokemon ?? [], species).map(({ id, name: sname }) => ({ id, name: sname }))

  const rel = (list) => (list ?? []).map((t) => ({ name: t.name, en: typeEnName(typeIndex, t.name) }))
  const dr = type.damage_relations
  const relations = [
    { term: 'Super effective against', types: rel(dr.double_damage_to) },
    { term: 'Not very effective against', types: rel(dr.half_damage_to) },
    { term: 'No effect against', types: rel(dr.no_damage_to) },
    { term: 'Weak to', types: rel(dr.double_damage_from) },
    { term: 'Resists', types: rel(dr.half_damage_from) },
    { term: 'Immune to', types: rel(dr.no_damage_from) },
  ]

  const moves = (type.moves ?? [])
    .map((m) => ({ name: m.name, label: humanize(m.name) }))
    .sort((a, b) => a.label.localeCompare(b.label))

  return { enName: enName(type), relations, mons, moves }
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

    <section class="surface" aria-labelledby="relations-heading">
      <h2 id="relations-heading">Damage relations</h2>
      <dl class="relations">
        <div v-for="r in data.relations" :key="r.term" class="relation">
          <dt>{{ r.term }}</dt>
          <dd>
            <span v-if="!r.types.length">None</span>
            <TypeBadge v-for="t in r.types" v-else :key="t.name" :name="t.name" :label="t.en" />
          </dd>
        </div>
      </dl>
    </section>

    <section class="surface" aria-labelledby="pokemon-heading">
      <h2 id="pokemon-heading">Pokémon</h2>
      <p class="result-count">{{ data.mons.length }} Pokémon</p>
      <ul class="card-grid">
        <PokemonCard v-for="s in data.mons" :key="s.id" :id="s.id" :name="s.name" />
      </ul>
    </section>

    <section class="surface" aria-labelledby="moves-heading">
      <h2 id="moves-heading">Moves</h2>
      <p class="result-count">{{ data.moves.length }} moves</p>
      <ul class="moves-list">
        <li v-for="m in data.moves" :key="m.name">
          <NuxtLink :to="`/moves/${m.name}`">{{ m.label }}</NuxtLink>
        </li>
      </ul>
    </section>
  </div>
</template>
