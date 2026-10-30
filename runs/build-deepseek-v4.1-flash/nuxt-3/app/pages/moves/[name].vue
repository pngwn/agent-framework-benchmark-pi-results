<template>
  <NotFoundContent v-if="data?.notFound || !data" />
  <div v-else class="move-page">
    <h1>{{ data.name }}</h1>

    <dl class="inline-facts">
      <div>
        <dt>Type</dt>
        <dd>
          <NuxtLink :to="`/types/${data.typeName}`" class="type-link">
            <TypeBadge :type="{ name: data.typeName, label: data.typeLabel }" />
          </NuxtLink>
        </dd>
      </div>
      <div>
        <dt>Category</dt>
        <dd>{{ data.category }}</dd>
      </div>
      <div>
        <dt>Power</dt>
        <dd>{{ formatValue(data.power) }}</dd>
      </div>
      <div>
        <dt>Accuracy</dt>
        <dd>{{ formatValue(data.accuracy) }}</dd>
      </div>
      <div>
        <dt>PP</dt>
        <dd>{{ formatValue(data.pp) }}</dd>
      </div>
    </dl>

    <section class="panel" aria-labelledby="effect-heading">
      <h2 id="effect-heading">Effect</h2>
      <p>{{ data.effect }}</p>
    </section>

    <section class="panel" aria-labelledby="learned-heading">
      <h2 id="learned-heading">Learned by</h2>
      <p class="result-count">{{ data.cards.length }} Pokémon</p>
      <ul class="card-grid">
        <PokemonCard v-for="card in data.cards" :key="card.id" :pokemon="card" />
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const route = useRoute()
const name = computed(() => String(route.params.name || ''))
const { data } = await useFetch<any>(() => `/api/move/${encodeURIComponent(name.value)}`, {
  watch: [name],
})

useHead(() => ({
  title: data.value?.notFound
    ? 'Not found – Pokédex'
    : data.value?.name
      ? `${data.value.name} – Pokédex`
      : 'Pokédex',
}))

function formatValue(value: any) {
  return value === null || value === undefined ? '—' : String(value)
}
</script>
