<script setup lang="ts">
import { computed } from 'vue'

const route = useRoute()
const name = computed(() => String(route.params.name || ''))
const { data } = await useFetch<any>(() => `/api/types/${encodeURIComponent(name.value)}`)

useHead({
  title: computed(() => (data.value?.found ? `${data.value.englishName} – Pokédex` : 'Not found – Pokédex')),
})
</script>

<template>
  <NotFoundContent v-if="!data?.found" />
  <div v-else class="type-page">
    <h1>{{ data.englishName }}</h1>

    <section class="panel" aria-labelledby="damage-heading">
      <h2 id="damage-heading">Damage relations</h2>
      <dl class="relations">
        <div v-for="relation in data.relations" :key="relation.term">
          <dt>{{ relation.term }}</dt>
          <dd>
            <template v-if="relation.types.length">
              <TypeBadge v-for="type in relation.types" :key="type.name" :type="type" link />
            </template>
            <template v-else>None</template>
          </dd>
        </div>
      </dl>
    </section>

    <section class="panel" aria-labelledby="pokemon-heading">
      <h2 id="pokemon-heading">Pokémon</h2>
      <p class="result-count">{{ data.pokemon.length }} Pokémon</p>
      <ul class="pokemon-grid">
        <li v-for="pokemon in data.pokemon" :key="pokemon.id">
          <PokemonCard :pokemon="pokemon" />
        </li>
      </ul>
    </section>

    <section class="panel" aria-labelledby="type-moves-heading">
      <h2 id="type-moves-heading">Moves</h2>
      <p class="result-count">{{ data.moves.length }} moves</p>
      <ul class="move-link-grid">
        <li v-for="move in data.moves" :key="move.name">
          <NuxtLink :to="`/moves/${move.name}`">{{ move.label }}</NuxtLink>
        </li>
      </ul>
    </section>
  </div>
</template>
