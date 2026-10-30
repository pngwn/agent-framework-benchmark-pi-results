<template>
  <li class="pokemon-card">
    <NuxtLink :to="`/pokemon/${pokemon.speciesName}`" class="pokemon-card-link">
      <img :src="pokemon.sprite" alt="" :width="96" :height="96" loading="lazy" />
      <span class="dex-number">#{{ String(pokemon.id).padStart(4, '0') }}</span>
      <span class="pokemon-card-name">{{ pokemon.name }}</span>
      <span v-if="showTypes && pokemon.types?.length" class="type-list card-types">
        <TypeBadge
          v-for="type in pokemon.types"
          :key="type.name"
          :type="{ name: type.name, label: type.english }"
        />
      </span>
    </NuxtLink>
    <span v-if="hidden" class="hidden-ability">Hidden ability</span>
  </li>
</template>

<script setup lang="ts">
defineProps<{
  pokemon: {
    id: number
    speciesName: string
    name: string
    sprite: string
    types?: Array<{ name: string; english: string }>
  }
  showTypes?: boolean
  hidden?: boolean
}>()
</script>
