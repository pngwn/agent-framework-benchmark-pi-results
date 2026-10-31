<script setup>
useHead({ title: 'Types – Pokédex' })

const { data } = await useFetch('/api/types')
</script>

<template>
  <div>
    <h1 class="page-title">Types</h1>
    <ul class="type-list">
      <li v-for="t in data ?? []" :key="t.name">
        <NuxtLink :to="`/types/${t.name}`" class="type-tile" :class="`type-${t.name}`">{{ t.en }}</NuxtLink>
      </li>
    </ul>
  </div>
</template>
