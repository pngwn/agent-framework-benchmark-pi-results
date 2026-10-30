<template>
  <NotFoundPage v-if="!data?.found" />
  <div v-else class="ability-page">
    <h1>{{ data.englishName }}</h1>

    <section class="page-section" aria-labelledby="effect-heading">
      <h2 id="effect-heading">Effect</h2>
      <p>{{ data.effect }}</p>
    </section>

    <section class="page-section" aria-labelledby="pokemon-heading">
      <h2 id="pokemon-heading">Pokémon</h2>
      <p class="result-count">{{ data.pokemon.length }} Pokémon</p>
      <ul class="card-grid">
        <PokemonCard
          v-for="pokemon in data.pokemon"
          :key="pokemon.id"
          :pokemon="pokemon"
          :hidden="pokemon.hidden"
        />
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const name = computed(() => String(route.params.name || ''))
const { data } = await useFetch(() => `/api/app/ability/${encodeURIComponent(name.value)}`)

useHead({
  title: computed(() => data.value?.found ? `${data.value.englishName} – Pokédex` : 'Not found – Pokédex'),
})
</script>
