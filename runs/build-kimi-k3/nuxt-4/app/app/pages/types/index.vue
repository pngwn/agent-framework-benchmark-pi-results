<script setup lang="ts">
import { getTypes } from '~/lib/pokeapi'

useHead({ title: 'Types – Pokédex' })

const base = useApiBase()
const { data: types } = await useAsyncData('types', () => getTypes(base))
</script>

<template>
  <div>
    <h1>Types</h1>
    <ul class="type-tiles">
      <li v-for="t in types ?? []" :key="t.name">
        <NuxtLink :to="`/types/${t.name}`" :style="{ backgroundColor: `var(--type-${t.name})` }">{{ t.english }}</NuxtLink>
      </li>
    </ul>
  </div>
</template>
