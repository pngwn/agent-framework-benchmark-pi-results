<script setup lang="ts">
import { setResponseStatus } from 'h3'

const route = useRoute()
const name = computed(() => String(route.params.name).toLowerCase())
const { data: m, error } = await useFetch(() => `/api/moves/${name.value}`, { watch: [name] })

const requestEvent = useRequestEvent()
if (error.value && requestEvent) setResponseStatus(requestEvent, 404)

useHead({
  title: computed(() => (m.value ? `${m.value.enName} – Pokédex` : 'Not found – Pokédex')),
})
</script>

<template>
  <NotFound v-if="error" />
  <div v-else-if="m">
    <h1>{{ m.enName }}</h1>

    <dl class="facts card-block">
      <div>
        <dt>Type</dt>
        <dd>
          <NuxtLink v-if="m.type" :to="`/types/${m.type.name}`">{{ m.type.label }}</NuxtLink>
          <template v-else>—</template>
        </dd>
      </div>
      <div>
        <dt>Category</dt>
        <dd>{{ m.category ?? '—' }}</dd>
      </div>
      <div>
        <dt>Power</dt>
        <dd>{{ m.power ?? '—' }}</dd>
      </div>
      <div>
        <dt>Accuracy</dt>
        <dd>{{ m.accuracy ?? '—' }}</dd>
      </div>
      <div>
        <dt>PP</dt>
        <dd>{{ m.pp ?? '—' }}</dd>
      </div>
    </dl>

    <section class="card-block" aria-labelledby="effect-heading">
      <h2 id="effect-heading">Effect</h2>
      <p>{{ m.effect ?? '—' }}</p>
    </section>

    <section class="card-block" aria-labelledby="learned-heading">
      <h2 id="learned-heading">Learned by</h2>
      <p class="count">{{ m.learnedBy.length }} Pokémon</p>
      <ul class="card-grid">
        <li v-for="s in m.learnedBy" :key="s.id">
          <PokemonCard :id="s.id" :name="s.name" />
        </li>
      </ul>
    </section>
  </div>
</template>
