<script setup lang="ts">
import { computed } from 'vue'

const route = useRoute()
const { data } = await useFetch(() => `/api/move/${route.params.name}`)

useHead({
  title: computed(() => data.value?.notFound ? 'Not found – Pokédex' : `${data.value?.label ?? ''} – Pokédex`),
})
</script>

<template>
  <NotFoundContent v-if="data?.notFound" />
  <div v-else-if="data">
    <h1 class="page-title">{{ data.label }}</h1>

    <dl class="fact-list">
      <div class="fact">
        <dt>Type</dt>
        <dd><TypeBadge :name="data.type.label" :slug="data.type.name" link /></dd>
      </div>
      <div class="fact">
        <dt>Category</dt>
        <dd>{{ data.category }}</dd>
      </div>
      <div class="fact">
        <dt>Power</dt>
        <dd>{{ data.power ?? '—' }}</dd>
      </div>
      <div class="fact">
        <dt>Accuracy</dt>
        <dd>{{ data.accuracy ?? '—' }}</dd>
      </div>
      <div class="fact">
        <dt>PP</dt>
        <dd>{{ data.pp ?? '—' }}</dd>
      </div>
    </dl>

    <section class="content-section" aria-labelledby="effect-heading">
      <h2 id="effect-heading">Effect</h2>
      <p>{{ data.effect }}</p>
    </section>

    <section class="content-section" aria-labelledby="learned-by-heading">
      <h2 id="learned-by-heading">Learned by</h2>
      <p class="section-count">{{ data.count }} Pokémon</p>
      <PokemonGrid :cards="data.cards" />
    </section>
  </div>
</template>
