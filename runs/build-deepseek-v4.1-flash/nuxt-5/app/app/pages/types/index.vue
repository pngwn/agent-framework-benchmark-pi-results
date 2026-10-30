<template>
  <div class="types-page">
    <h1>Types</h1>
    <ul class="type-list">
      <li v-for="type in data?.types || []" :key="type.name">
        <NuxtLink class="type-list__link" :class="`type-${type.name}`" :to="`/types/${type.name}`">{{ type.label }}</NuxtLink>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
useHead({ title: 'Types – Pokédex' })
const { data } = await useFetch('/api/app/types')
</script>
