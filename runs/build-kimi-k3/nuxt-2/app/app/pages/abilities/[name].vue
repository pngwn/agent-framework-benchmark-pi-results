<script setup lang="ts">
import { setResponseStatus } from 'h3'

const route = useRoute()
const name = computed(() => String(route.params.name).toLowerCase())
const { data: a, error } = await useFetch(() => `/api/abilities/${name.value}`, { watch: [name] })

const requestEvent = useRequestEvent()
if (error.value && requestEvent) setResponseStatus(requestEvent, 404)

useHead({
  title: computed(() => (a.value ? `${a.value.enName} – Pokédex` : 'Not found – Pokédex')),
})
</script>

<template>
  <NotFound v-if="error" />
  <div v-else-if="a">
    <h1>{{ a.enName }}</h1>

    <section class="card-block" aria-labelledby="effect-heading">
      <h2 id="effect-heading">Effect</h2>
      <p>{{ a.effect ?? '—' }}</p>
    </section>

    <section class="card-block" aria-labelledby="pokemon-heading">
      <h2 id="pokemon-heading">Pokémon</h2>
      <p class="count">{{ a.pokemon.length }} Pokémon</p>
      <ul class="card-grid">
        <li v-for="s in a.pokemon" :key="s.id">
          <PokemonCard :id="s.id" :name="s.name" :hidden="s.hidden" />
        </li>
      </ul>
    </section>
  </div>
</template>
