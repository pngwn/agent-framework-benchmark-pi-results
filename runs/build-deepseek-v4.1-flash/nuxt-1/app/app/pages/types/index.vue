<script setup lang="ts">
const { data } = await useFetch<any>('/api/types')

useHead({ title: 'Types – Pokédex' })
</script>

<template>
  <div class="types-page">
    <h1>Types</h1>
    <ul class="type-grid">
      <li v-for="type in data || []" :key="type.name">
        <NuxtLink :to="`/types/${type.name}`" :class="['type-tile', `type-${type.name}`]">{{ type.label }}</NuxtLink>
      </li>
    </ul>
  </div>
</template>
