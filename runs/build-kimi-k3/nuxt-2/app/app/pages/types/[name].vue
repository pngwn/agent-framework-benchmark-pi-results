<script setup lang="ts">
import { setResponseStatus } from 'h3'

const route = useRoute()
const name = computed(() => String(route.params.name).toLowerCase())
const { data: t, error } = await useFetch(() => `/api/types/${name.value}`, { watch: [name] })

const requestEvent = useRequestEvent()
if (error.value && requestEvent) setResponseStatus(requestEvent, 404)

useHead({
  title: computed(() => (t.value ? `${t.value.enName} – Pokédex` : 'Not found – Pokédex')),
})
</script>

<template>
  <NotFound v-if="error" />
  <div v-else-if="t">
    <h1>{{ t.enName }}</h1>

    <section class="card-block" aria-labelledby="relations-heading">
      <h2 id="relations-heading">Damage relations</h2>
      <dl class="relations">
        <div v-for="r in t.relations" :key="r.label" class="relation">
          <dt>{{ r.label }}</dt>
          <dd>
            <template v-if="r.types.length">
              <NuxtLink
                v-for="x in r.types"
                :key="x.name"
                :to="`/types/${x.name}`"
                class="type-badge"
                :class="`type-${x.name}`"
              >{{ x.label }}</NuxtLink>
            </template>
            <template v-else>None</template>
          </dd>
        </div>
      </dl>
    </section>

    <section class="card-block" aria-labelledby="pokemon-heading">
      <h2 id="pokemon-heading">Pokémon</h2>
      <p class="count">{{ t.pokemon.length }} Pokémon</p>
      <ul class="card-grid">
        <li v-for="s in t.pokemon" :key="s.id">
          <PokemonCard :id="s.id" :name="s.name" />
        </li>
      </ul>
    </section>

    <section class="card-block" aria-labelledby="moves-heading">
      <h2 id="moves-heading">Moves</h2>
      <p class="count">{{ t.moves.length }} moves</p>
      <ul class="moves-list">
        <li v-for="mv in t.moves" :key="mv.name">
          <NuxtLink :to="`/moves/${mv.name}`">{{ mv.label }}</NuxtLink>
        </li>
      </ul>
    </section>
  </div>
</template>
