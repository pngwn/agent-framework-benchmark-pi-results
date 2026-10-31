<script setup>
const route = useRoute()
const name = String(route.params.name)

const { data } = await useAsyncData(`ability:${name}`, async () => {
  let ability
  try {
    ability = await fetchApi(`/api/v2/ability/${encodeURIComponent(name)}/`)
  } catch {
    return null
  }
  const species = await getSpeciesList()
  const list = mapPokemonToSpecies(ability.pokemon ?? [], species).map(({ id, name: sname, entry }) => ({
    id,
    name: sname,
    hidden: entry.is_hidden,
  }))
  return {
    enName: enName(ability),
    effect: enShortEffect(ability) || '—',
    list,
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

    <section class="surface" aria-labelledby="effect-heading">
      <h2 id="effect-heading">Effect</h2>
      <p>{{ data.effect }}</p>
    </section>

    <section class="surface" aria-labelledby="pokemon-heading">
      <h2 id="pokemon-heading">Pokémon</h2>
      <p class="result-count">{{ data.list.length }} Pokémon</p>
      <ul class="card-grid">
        <PokemonCard v-for="s in data.list" :key="s.id" :id="s.id" :name="s.name" :hidden="s.hidden" />
      </ul>
    </section>
  </div>
</template>
