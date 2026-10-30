<script setup lang="ts">
const { data } = await useFetch('/api/types')

useHead({
  title: 'Types – Pokédex',
})
</script>

<template>
  <div>
    <h1 class="page-title">Types</h1>
    <ul class="type-list">
      <li v-for="type in data?.types ?? []" :key="type.name">
        <NuxtLink
          :to="`/types/${type.name}`"
          class="type-list__link"
          :style="{ backgroundColor: `var(--type-${type.name}, var(--color-text-muted))` }"
        >
          {{ type.label }}
        </NuxtLink>
      </li>
    </ul>
  </div>
</template>
