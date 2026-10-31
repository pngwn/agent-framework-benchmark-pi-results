<script setup>
const route = useRoute()

const { data, error } = await useFetch(() => `/api/move/${route.params.name}`)

const notFound = computed(() => Boolean(error.value) || !data.value)
if (import.meta.server && error.value) setResponseStatus(404)

useHead({
  title: computed(() => (notFound.value ? 'Not found – Pokédex' : `${data.value.en} – Pokédex`)),
})

const fmt = (v) => (v === null || v === undefined ? '—' : v)
</script>

<template>
  <NotFound v-if="notFound" />
  <div v-else>
    <h1 class="page-title">{{ data.en }}</h1>

    <dl class="surface-card move-facts">
      <div>
        <dt>Type</dt>
        <dd>
          <NuxtLink
            v-if="data.type"
            :to="`/types/${data.type.name}`"
            class="type-badge"
            :class="`type-${data.type.name}`"
          >
            {{ data.type.en }}
          </NuxtLink>
          <template v-else>—</template>
        </dd>
      </div>
      <div>
        <dt>Category</dt>
        <dd>{{ fmt(data.category) }}</dd>
      </div>
      <div>
        <dt>Power</dt>
        <dd>{{ fmt(data.power) }}</dd>
      </div>
      <div>
        <dt>Accuracy</dt>
        <dd>{{ fmt(data.accuracy) }}</dd>
      </div>
      <div>
        <dt>PP</dt>
        <dd>{{ fmt(data.pp) }}</dd>
      </div>
    </dl>

    <PokeSection title="Effect">
      <p>{{ data.effect ?? '—' }}</p>
    </PokeSection>

    <PokeSection title="Learned by">
      <p class="result-count">{{ data.learnedBy.length }} Pokémon</p>
      <ul class="card-grid">
        <PokemonCard
          v-for="c in data.learnedBy"
          :key="c.id"
          :id="c.id"
          :name="c.name"
          :label="c.label"
          :sprite="c.sprite"
        />
      </ul>
    </PokeSection>
  </div>
</template>
