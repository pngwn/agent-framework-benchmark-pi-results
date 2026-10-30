<template>
  <NotFoundContent v-if="data?.notFound || !data" />
  <div v-else class="ability-page">
    <h1>{{ data.name }}</h1>

    <section class="panel" aria-labelledby="effect-heading">
      <h2 id="effect-heading">Effect</h2>
      <p>{{ data.effect }}</p>
    </section>

    <section class="panel" aria-labelledby="pokemon-heading">
      <h2 id="pokemon-heading">Pokémon</h2>
      <p class="result-count">{{ data.cards.length }} Pokémon</p>
      <ul class="card-grid">
        <PokemonCard
          v-for="card in data.cards"
          :key="card.id"
          :pokemon="card"
          :hidden="card.hidden"
        />
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const route = useRoute()
const name = computed(() => String(route.params.name || ''))
const { data } = await useFetch<any>(() => `/api/ability/${encodeURIComponent(name.value)}`, {
  watch: [name],
})

useHead(() => ({
  title: data.value?.notFound
    ? 'Not found – Pokédex'
    : data.value?.name
      ? `${data.value.name} – Pokédex`
      : 'Pokédex',
}))
</script>
