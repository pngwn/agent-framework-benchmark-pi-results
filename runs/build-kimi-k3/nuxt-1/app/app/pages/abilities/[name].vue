<script setup>
const route = useRoute()

const { data, error } = await useFetch(() => `/api/ability/${route.params.name}`)

const notFound = computed(() => Boolean(error.value) || !data.value)
if (import.meta.server && error.value) setResponseStatus(404)

useHead({
  title: computed(() => (notFound.value ? 'Not found – Pokédex' : `${data.value.en} – Pokédex`)),
})
</script>

<template>
  <NotFound v-if="notFound" />
  <div v-else>
    <h1 class="page-title">{{ data.en }}</h1>

    <PokeSection title="Effect">
      <p>{{ data.effect ?? '—' }}</p>
    </PokeSection>

    <PokeSection title="Pokémon">
      <p class="result-count">{{ data.pokemon.length }} Pokémon</p>
      <ul class="card-grid">
        <PokemonCard
          v-for="c in data.pokemon"
          :key="c.id"
          :id="c.id"
          :name="c.name"
          :label="c.label"
          :sprite="c.sprite"
          :hidden="c.hidden"
        />
      </ul>
    </PokeSection>
  </div>
</template>
