<script setup lang="ts">
defineProps<{
  card: {
    id: number
    dex: string
    slug: string
    name: string
    sprite: string
    types?: { name: string; englishName: string }[]
    hidden?: boolean
  }
}>()
</script>

<template>
  <li class="pokemon-card">
    <NuxtLink :to="`/pokemon/${card.slug}`" class="pokemon-card__link">
      <img
        class="pokemon-card__sprite"
        :src="card.sprite"
        :alt="card.name"
        width="96"
        height="96"
        loading="lazy"
      >
      <span class="pokemon-card__dex">{{ card.dex }}</span>
      <span class="pokemon-card__name">{{ card.name }}</span>
      <span v-if="card.types?.length" class="pokemon-card__types">
        <TypeBadge
          v-for="type in card.types"
          :key="type.name"
          :name="type.englishName"
          :slug="type.name"
          small
        />
      </span>
      <span v-if="card.hidden" class="pokemon-card__hidden">Hidden ability</span>
    </NuxtLink>
  </li>
</template>
