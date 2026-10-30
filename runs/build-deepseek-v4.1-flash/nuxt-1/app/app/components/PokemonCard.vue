<script setup lang="ts">
const props = defineProps<{
  pokemon: {
    id: number
    name: string
    nameLabel: string
    sprite: string
    types?: Array<{ name: string; label: string }>
  }
  showTypes?: boolean
}>()
</script>

<template>
  <NuxtLink class="pokemon-card" :to="`/pokemon/${pokemon.name}`">
    <img class="pokemon-card__sprite" :src="pokemon.sprite" :alt="pokemon.nameLabel" loading="lazy" />
    <span class="pokemon-card__dex">#{{ String(pokemon.id).padStart(4, '0') }}</span>
    <span class="pokemon-card__name">{{ pokemon.nameLabel }}</span>
    <span v-if="showTypes && pokemon.types?.length" class="pokemon-card__types">
      <TypeBadge v-for="type in pokemon.types" :key="type.name" :type="type" />
    </span>
    <span v-if="pokemon.hidden" class="pokemon-card__hidden">Hidden ability</span>
  </NuxtLink>
</template>
