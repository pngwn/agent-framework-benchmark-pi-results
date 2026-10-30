<script setup lang="ts">
import { computed } from 'vue'

const route = useRoute()
const name = computed(() => String(route.params.name || ''))
const { data } = await useFetch<any>(() => `/api/ability/${encodeURIComponent(name.value)}`)

useHead({
  title: computed(() => (data.value?.found ? `${data.value.englishName} – Pokédex` : 'Not found – Pokédex')),
})
</script>

<template>
  <NotFoundContent v-if="!data?.found" />
  <div v-else class="ability-page">
    <h1>{{ data.englishName }}</h1>

    <section class="panel" aria-labelledby="effect-heading">
      <h2 id="effect-heading">Effect</h2>
      <p>{{ data.effect }}</p>
    </section>

    <section class="panel" aria-labelledby="pokemon-heading">
      <h2 id="pokemon-heading">Pokémon</h2>
      <p class="result-count">{{ data.pokemon.length }} Pokémon</p>
      <ul class="pokemon-grid">
        <li v-for="pokemon in data.pokemon" :key="pokemon.id">
          <PokemonCard :pokemon="pokemon" />
        </li>
      </ul>
    </section>
  </div>
</template>
