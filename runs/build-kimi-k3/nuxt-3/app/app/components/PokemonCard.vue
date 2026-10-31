<script setup lang="ts">
import type { PokemonCardModel } from '~/utils/poke'

defineProps<{
  card: PokemonCardModel
  types?: { name: string; en: string }[]
}>()
</script>

<template>
  <li class="card">
    <NuxtLink :to="`/pokemon/${card.speciesName}`" class="card-link">
      <img :src="card.sprite" alt="" width="96" height="96" />
      <span class="card-dex">{{ dexNumber(card.id) }}</span>
      <span class="card-name">{{ card.name }}</span>
      <span v-if="types?.length" class="card-types">
        <span v-for="t in types" :key="t.name" class="type-badge" :class="`type-${t.name}`">{{ t.en }}</span>
      </span>
      <span v-if="card.hidden" class="card-hidden">Hidden ability</span>
    </NuxtLink>
  </li>
</template>
