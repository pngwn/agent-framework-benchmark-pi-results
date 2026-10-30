<script setup lang="ts">
usePageTitle('Types');
const types = await usePageData<{ name: string; label: string }[]>(
  () => '/api/types',
  () => 'types',
);
</script>

<template>
  <h1>Types</h1>
  <ul class="type-grid">
    <li v-for="t in types" :key="t.name">
      <TypeBadge :name="t.name" :label="t.label" link large />
    </li>
  </ul>
</template>
