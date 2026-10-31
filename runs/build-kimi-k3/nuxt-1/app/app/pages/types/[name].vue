<script setup>
const route = useRoute()

const { data, error } = await useFetch(() => `/api/type/${route.params.name}`)

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

    <PokeSection title="Damage relations">
      <dl class="relations">
        <div v-for="r in data.relations" :key="r.term">
          <dt>{{ r.term }}</dt>
          <dd>
            <template v-if="r.types.length">
              <NuxtLink
                v-for="t in r.types"
                :key="t.name"
                :to="`/types/${t.name}`"
                class="type-badge"
                :class="`type-${t.name}`"
              >
                {{ t.en }}
              </NuxtLink>
            </template>
            <span v-else>None</span>
          </dd>
        </div>
      </dl>
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
        />
      </ul>
    </PokeSection>

    <PokeSection title="Moves">
      <p class="result-count">{{ data.moves.length }} moves</p>
      <ul class="move-link-list">
        <li v-for="m in data.moves" :key="m.name">
          <NuxtLink :to="`/moves/${m.name}`">{{ m.label }}</NuxtLink>
        </li>
      </ul>
    </PokeSection>
  </div>
</template>
