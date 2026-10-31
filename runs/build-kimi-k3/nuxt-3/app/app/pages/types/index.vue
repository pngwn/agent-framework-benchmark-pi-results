<script setup lang="ts">
useHead({ title: 'Types – Pokédex' })

const { data } = await useAsyncData('types', async () => {
  const typeIndex = await getTypeIndex()
  return { types: typeIndex.types }
})
</script>

<template>
  <h1>Types</h1>
  <ul class="type-list">
    <li v-for="t in data?.types ?? []" :key="t.name">
      <NuxtLink :to="`/types/${t.name}`" :class="`type-${t.name}`">{{ t.en }}</NuxtLink>
    </li>
  </ul>
</template>
