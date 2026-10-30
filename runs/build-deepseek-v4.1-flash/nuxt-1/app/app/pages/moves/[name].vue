<script setup lang="ts">
import { computed } from 'vue'

const route = useRoute()
const name = computed(() => String(route.params.name || ''))
const { data } = await useFetch<any>(() => `/api/move/${encodeURIComponent(name.value)}`)

useHead({
  title: computed(() => (data.value?.found ? `${data.value.englishName} – Pokédex` : 'Not found – Pokédex')),
})

function display(value: any) {
  return value === null || value === undefined ? '—' : String(value)
}
</script>

<template>
  <NotFoundContent v-if="!data?.found" />
  <div v-else class="move-page">
    <h1>{{ data.englishName }}</h1>

    <div class="panel facts-panel">
      <dl class="facts">
        <div>
          <dt>Type</dt>
          <dd><TypeBadge :type="data.type" link /></dd>
        </div>
        <div>
          <dt>Category</dt>
          <dd>{{ data.category.label }}</dd>
        </div>
        <div>
          <dt>Power</dt>
          <dd>{{ display(data.power) }}</dd>
        </div>
        <div>
          <dt>Accuracy</dt>
          <dd>{{ display(data.accuracy) }}</dd>
        </div>
        <div>
          <dt>PP</dt>
          <dd>{{ display(data.pp) }}</dd>
        </div>
      </dl>
    </div>

    <section class="panel" aria-labelledby="effect-heading">
      <h2 id="effect-heading">Effect</h2>
      <p>{{ data.effect }}</p>
    </section>

    <section class="panel" aria-labelledby="learned-heading">
      <h2 id="learned-heading">Learned by</h2>
      <p class="result-count">{{ data.learned.length }} Pokémon</p>
      <ul class="pokemon-grid">
        <li v-for="pokemon in data.learned" :key="pokemon.id">
          <PokemonCard :pokemon="pokemon" />
        </li>
      </ul>
    </section>
  </div>
</template>
