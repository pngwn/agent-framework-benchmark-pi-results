<script setup lang="ts">
definePageMeta({
  key: (route) => route.fullPath,
})

const route = useRoute()
const name = computed(() => String(route.params.name))
const { data } = await useAsyncData(`type-${route.fullPath}`, () =>
  $fetch<any>(`/api/type/${encodeURIComponent(name.value)}`),
)

const type = computed<any>(() => (data.value?.found ? data.value.type : null))
const relations = computed<any[]>(() =>
  data.value?.found ? data.value.relations : [],
)
const pokemon = computed<any[]>(() =>
  data.value?.found ? data.value.pokemon : [],
)
const moves = computed<any[]>(() =>
  data.value?.found ? data.value.moves : [],
)
const heading = computed(() => type.value?.englishName ?? 'Not found')

useHead({
  title: computed(() => `${heading.value} – Pokédex`),
})
</script>

<template>
  <div class="page detail-page">
    <NotFoundContent v-if="!type" />

    <template v-else>
      <h1>{{ type.englishName }}</h1>

      <section class="surface" aria-labelledby="relations-heading">
        <h2 id="relations-heading">Damage relations</h2>
        <dl class="relations-grid">
          <div v-for="relation in relations" :key="relation.label" class="relation">
            <dt>{{ relation.label }}</dt>
            <dd>
              <template v-if="relation.types.length">
                <span class="relation-types">
                  <TypeBadge
                    v-for="related in relation.types"
                    :key="related.name"
                    :name="related.name"
                    :label="related.label"
                    link
                  />
                </span>
              </template>
              <span v-else>None</span>
            </dd>
          </div>
        </dl>
      </section>

      <section class="surface" aria-labelledby="pokemon-heading">
        <h2 id="pokemon-heading">Pokémon</h2>
        <p class="result-count">{{ pokemon.length }} Pokémon</p>
        <PokemonCardList :pokemon="pokemon" />
      </section>

      <section class="surface" aria-labelledby="moves-heading">
        <h2 id="moves-heading">Moves</h2>
        <p class="result-count">{{ moves.length }} moves</p>
        <ul class="move-links">
          <li v-for="move in moves" :key="move.name">
            <NuxtLink :to="`/moves/${move.name}`">{{ move.label }}</NuxtLink>
          </li>
        </ul>
      </section>
    </template>
  </div>
</template>
