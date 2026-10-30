<template>
  <NotFoundPage v-if="!data?.found" />
  <div v-else class="type-page">
    <h1>{{ data.englishName }}</h1>

    <section class="page-section" aria-labelledby="damage-heading">
      <h2 id="damage-heading">Damage relations</h2>
      <dl class="damage-relations">
        <div v-for="relation in data.damageRelations" :key="relation.term">
          <dt>{{ relation.term }}</dt>
          <dd>
            <template v-if="relation.types.length">
              <NuxtLink
                v-for="type in relation.types"
                :key="type.name"
                class="type-badge"
                :class="`type-${type.name}`"
                :to="`/types/${type.name}`"
              >{{ type.label }}</NuxtLink>
            </template>
            <template v-else>None</template>
          </dd>
        </div>
      </dl>
    </section>

    <section class="page-section" aria-labelledby="pokemon-heading">
      <h2 id="pokemon-heading">Pokémon</h2>
      <p class="result-count">{{ data.pokemon.length }} Pokémon</p>
      <ul class="card-grid">
        <PokemonCard v-for="pokemon in data.pokemon" :key="pokemon.id" :pokemon="pokemon" />
      </ul>
    </section>

    <section class="page-section" aria-labelledby="moves-heading">
      <h2 id="moves-heading">Moves</h2>
      <p class="result-count">{{ data.moves.length }} moves</p>
      <ul class="move-link-list">
        <li v-for="move in data.moves" :key="move.name">
          <NuxtLink :to="`/moves/${move.name}`">{{ move.label }}</NuxtLink>
        </li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const name = computed(() => String(route.params.name || ''))
const { data } = await useFetch(() => `/api/app/type/${encodeURIComponent(name.value)}`)

useHead({
  title: computed(() => data.value?.found ? `${data.value.englishName} – Pokédex` : 'Not found – Pokédex'),
})
</script>
