<template>
  <NotFoundContent v-if="data?.notFound || !data" />
  <div v-else class="type-page">
    <h1>{{ data.name }}</h1>

    <section class="panel" aria-labelledby="relations-heading">
      <h2 id="relations-heading">Damage relations</h2>
      <dl class="relations-list">
        <div v-for="relation in data.relations" :key="relation.label" class="relation">
          <dt>{{ relation.label }}</dt>
          <dd>
            <template v-if="relation.types.length">
              <NuxtLink
                v-for="type in relation.types"
                :key="type.name"
                :to="`/types/${type.name}`"
                class="type-link"
              >
                <TypeBadge :type="{ name: type.name, label: type.english }" />
              </NuxtLink>
            </template>
            <template v-else>None</template>
          </dd>
        </div>
      </dl>
    </section>

    <section class="panel" aria-labelledby="pokemon-heading">
      <h2 id="pokemon-heading">Pokémon</h2>
      <p class="result-count">{{ data.cards.length }} Pokémon</p>
      <ul class="card-grid">
        <PokemonCard v-for="card in data.cards" :key="card.id" :pokemon="card" />
      </ul>
    </section>

    <section class="panel" aria-labelledby="moves-heading">
      <h2 id="moves-heading">Moves</h2>
      <p class="result-count">{{ data.moves.length }} moves</p>
      <ul class="move-link-grid">
        <li v-for="move in data.moves" :key="move.name">
          <NuxtLink :to="`/moves/${move.name}`">{{ move.label }}</NuxtLink>
        </li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const route = useRoute()
const name = computed(() => String(route.params.name || ''))
const { data } = await useFetch<any>(() => `/api/type/${encodeURIComponent(name.value)}`, {
  watch: [name],
})

useHead(() => ({
  title: data.value?.notFound
    ? 'Not found – Pokédex'
    : data.value?.name
      ? `${data.value.name} – Pokédex`
      : 'Pokédex',
}))
</script>
