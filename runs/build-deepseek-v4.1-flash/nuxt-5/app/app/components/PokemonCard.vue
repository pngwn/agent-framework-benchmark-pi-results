<template>
  <li class="pokemon-card">
    <NuxtLink class="pokemon-card__link" :to="`/pokemon/${pokemon.name}`">
      <img
        v-if="pokemon.sprite"
        class="pokemon-card__sprite"
        :src="pokemon.sprite"
        :alt="pokemon.displayName"
        width="96"
        height="96"
        loading="lazy"
      >
      <span class="pokemon-card__number">#{{ String(pokemon.id).padStart(4, '0') }}</span>
      <span class="pokemon-card__name">{{ pokemon.displayName }}</span>
      <span v-if="showTypes && pokemon.types?.length" class="pokemon-card__types">
        <span
          v-for="type in pokemon.types"
          :key="type.name"
          class="type-badge"
          :class="`type-${type.name}`"
        >{{ type.label }}</span>
      </span>
      <span v-if="hidden" class="pokemon-card__hidden">Hidden ability</span>
    </NuxtLink>
  </li>
</template>

<script setup lang="ts">
defineProps<{
  pokemon: {
    id: number
    name: string
    displayName: string
    sprite?: string | null
    types?: Array<{ name: string; label: string }>
  }
  showTypes?: boolean
  hidden?: boolean
}>()
</script>
