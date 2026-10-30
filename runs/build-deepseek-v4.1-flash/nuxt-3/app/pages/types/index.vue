<template>
  <div class="types-page">
    <h1>Types</h1>
    <ul class="type-link-grid">
      <li v-for="type in types" :key="type.name">
        <NuxtLink
          :to="`/types/${type.name}`"
          class="type-tile"
          :style="{ backgroundColor: `var(--type-${type.name})` }"
        >
          {{ type.english }}
        </NuxtLink>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

useHead({ title: 'Types – Pokédex' })

const { data } = await useFetch<any>('/api/pokedex')
const types = computed<any[]>(() => data.value?.types || [])
</script>
