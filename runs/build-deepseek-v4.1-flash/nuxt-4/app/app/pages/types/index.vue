<script setup lang="ts">
useHead({ title: 'Types – Pokédex' })

const { data: catalogData } = await useAsyncData('catalog', () =>
  $fetch('/api/catalog'),
)
const types = computed<any[]>(() => catalogData.value?.types ?? [])
</script>

<template>
  <div class="page types-page">
    <h1>Types</h1>

    <ul class="type-links">
      <li v-for="type in types" :key="type.name">
        <NuxtLink
          :to="`/types/${type.name}`"
          class="type-link"
          :class="`type-${type.name}`"
        >{{ type.englishName }}</NuxtLink>
      </li>
    </ul>
  </div>
</template>
