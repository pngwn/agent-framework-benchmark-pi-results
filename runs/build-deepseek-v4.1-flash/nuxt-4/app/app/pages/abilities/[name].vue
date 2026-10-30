<script setup lang="ts">
definePageMeta({
  key: (route) => route.fullPath,
})

const route = useRoute()
const name = computed(() => String(route.params.name))
const { data } = await useAsyncData(`ability-${route.fullPath}`, () =>
  $fetch<any>(`/api/ability/${encodeURIComponent(name.value)}`),
)

const ability = computed<any>(() =>
  data.value?.found ? data.value.ability : null,
)
const pokemon = computed<any[]>(() =>
  data.value?.found ? data.value.pokemon : [],
)
const heading = computed(() => ability.value?.englishName ?? 'Not found')

useHead({
  title: computed(() => `${heading.value} – Pokédex`),
})
</script>

<template>
  <div class="page detail-page">
    <NotFoundContent v-if="!ability" />

    <template v-else>
      <h1>{{ ability.englishName }}</h1>

      <section class="surface" aria-labelledby="effect-heading">
        <h2 id="effect-heading">Effect</h2>
        <p>{{ ability.effect }}</p>
      </section>

      <section class="surface" aria-labelledby="pokemon-heading">
        <h2 id="pokemon-heading">Pokémon</h2>
        <p class="result-count">{{ pokemon.length }} Pokémon</p>
        <PokemonCardList :pokemon="pokemon" />
      </section>
    </template>
  </div>
</template>
