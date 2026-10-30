<script setup lang="ts">
import { computed } from 'vue'

const route = useRoute()
const { data } = await useFetch(() => `/api/type/${route.params.name}`)

useHead({
  title: computed(() => data.value?.notFound ? 'Not found – Pokédex' : `${data.value?.label ?? ''} – Pokédex`),
})
</script>

<template>
  <NotFoundContent v-if="data?.notFound" />
  <div v-else-if="data">
    <h1 class="page-title">{{ data.label }}</h1>

    <section class="content-section" aria-labelledby="damage-relations-heading">
      <h2 id="damage-relations-heading">Damage relations</h2>
      <dl class="damage-relations">
        <div v-for="relation in data.relations" :key="relation.key" class="damage-relations__row">
          <dt>{{ relation.label }}</dt>
          <dd>
            <template v-if="relation.types.length">
              <TypeBadge
                v-for="type in relation.types"
                :key="type.name"
                :name="type.label"
                :slug="type.name"
                link
                small
              />
            </template>
            <template v-else>None</template>
          </dd>
        </div>
      </dl>
    </section>

    <section class="content-section" aria-labelledby="type-pokemon-heading">
      <h2 id="type-pokemon-heading">Pokémon</h2>
      <p class="section-count">{{ data.pokemonCount }} Pokémon</p>
      <PokemonGrid :cards="data.cards" />
    </section>

    <section class="content-section" aria-labelledby="type-moves-heading">
      <h2 id="type-moves-heading">Moves</h2>
      <p class="section-count">{{ data.moveCount }} moves</p>
      <ul class="move-link-list">
        <li v-for="move in data.moves" :key="move.slug">
          <NuxtLink :to="`/moves/${move.slug}`">{{ move.label }}</NuxtLink>
        </li>
      </ul>
    </section>
  </div>
</template>
