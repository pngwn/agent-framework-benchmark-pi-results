<script setup lang="ts">
definePageMeta({
  key: (route) => route.fullPath,
})

const route = useRoute()
const name = computed(() => String(route.params.name))
const { data } = await useAsyncData(`move-${route.fullPath}`, () =>
  $fetch<any>(`/api/move/${encodeURIComponent(name.value)}`),
)

const move = computed<any>(() => (data.value?.found ? data.value.move : null))
const pokemon = computed<any[]>(() =>
  data.value?.found ? data.value.pokemon : [],
)
const heading = computed(() => move.value?.englishName ?? 'Not found')

useHead({
  title: computed(() => `${heading.value} – Pokédex`),
})
</script>

<template>
  <div class="page detail-page">
    <NotFoundContent v-if="!move" />

    <template v-else>
      <h1>{{ move.englishName }}</h1>

      <dl class="fact-list">
        <div>
          <dt>Type</dt>
          <dd>
            <TypeBadge :name="move.typeName" :label="move.typeLabel" link />
          </dd>
        </div>
        <div>
          <dt>Category</dt>
          <dd>{{ move.category || '—' }}</dd>
        </div>
        <div>
          <dt>Power</dt>
          <dd>{{ displayValue(move.power) }}</dd>
        </div>
        <div>
          <dt>Accuracy</dt>
          <dd>{{ displayValue(move.accuracy) }}</dd>
        </div>
        <div>
          <dt>PP</dt>
          <dd>{{ displayValue(move.pp) }}</dd>
        </div>
      </dl>

      <section class="surface" aria-labelledby="effect-heading">
        <h2 id="effect-heading">Effect</h2>
        <p>{{ move.effect }}</p>
      </section>

      <section class="surface" aria-labelledby="learned-by-heading">
        <h2 id="learned-by-heading">Learned by</h2>
        <p class="result-count">{{ pokemon.length }} Pokémon</p>
        <PokemonCardList :pokemon="pokemon" />
      </section>
    </template>
  </div>
</template>
