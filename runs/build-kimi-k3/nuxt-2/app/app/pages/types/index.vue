<script setup lang="ts">
useHead({ title: 'Types – Pokédex' })
const { data } = await useFetch('/api/types')
</script>

<template>
  <div>
    <h1>Types</h1>
    <ul class="types-list">
      <li v-for="t in data?.types ?? []" :key="t.name">
        <NuxtLink :to="`/types/${t.name}`" class="type-tile" :class="`type-${t.name}`">{{ t.label }}</NuxtLink>
      </li>
    </ul>
  </div>
</template>
