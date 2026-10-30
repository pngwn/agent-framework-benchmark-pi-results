<template>
  <NotFoundPage v-if="!data?.found" />
  <div v-else class="move-page">
    <h1>{{ data.englishName }}</h1>

    <dl class="fact-card">
      <div>
        <dt>Type</dt>
        <dd>
          <NuxtLink class="type-badge" :class="`type-${data.type.name}`" :to="`/types/${data.type.name}`">{{ data.type.label }}</NuxtLink>
        </dd>
      </div>
      <div>
        <dt>Category</dt>
        <dd>{{ data.category }}</dd>
      </div>
      <div>
        <dt>Power</dt>
        <dd>{{ displayNumber(data.power) }}</dd>
      </div>
      <div>
        <dt>Accuracy</dt>
        <dd>{{ displayNumber(data.accuracy) }}</dd>
      </div>
      <div>
        <dt>PP</dt>
        <dd>{{ displayNumber(data.pp) }}</dd>
      </div>
    </dl>

    <section class="page-section" aria-labelledby="effect-heading">
      <h2 id="effect-heading">Effect</h2>
      <p>{{ data.effect }}</p>
    </section>

    <section class="page-section" aria-labelledby="learned-by-heading">
      <h2 id="learned-by-heading">Learned by</h2>
      <p class="result-count">{{ data.learnedBy.length }} Pokémon</p>
      <ul class="card-grid">
        <PokemonCard v-for="pokemon in data.learnedBy" :key="pokemon.id" :pokemon="pokemon" />
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const name = computed(() => String(route.params.name || ''))
const { data } = await useFetch(() => `/api/app/move/${encodeURIComponent(name.value)}`)

useHead({
  title: computed(() => data.value?.found ? `${data.value.englishName} – Pokédex` : 'Not found – Pokédex'),
})

function displayNumber(value: any) {
  return value === null || value === undefined || value === '' ? '—' : String(value)
}
</script>
