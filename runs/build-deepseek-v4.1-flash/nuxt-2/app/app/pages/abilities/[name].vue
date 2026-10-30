<script setup lang="ts">
import { computed } from 'vue'

const route = useRoute()
const { data } = await useFetch(() => `/api/ability/${route.params.name}`)

useHead({
  title: computed(() => data.value?.notFound ? 'Not found – Pokédex' : `${data.value?.label ?? ''} – Pokédex`),
})
</script>

<template>
  <NotFoundContent v-if="data?.notFound" />
  <div v-else-if="data">
    <h1 class="page-title">{{ data.label }}</h1>

    <section class="content-section" aria-labelledby="effect-heading">
      <h2 id="effect-heading">Effect</h2>
      <p>{{ data.effect }}</p>
    </section>

    <section class="content-section" aria-labelledby="ability-pokemon-heading">
      <h2 id="ability-pokemon-heading">Pokémon</h2>
      <p class="section-count">{{ data.count }} Pokémon</p>
      <PokemonGrid :cards="data.cards" />
    </section>
  </div>
</template>
