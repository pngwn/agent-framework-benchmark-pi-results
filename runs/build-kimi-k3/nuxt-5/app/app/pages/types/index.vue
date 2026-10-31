<script setup>
useHead({ title: 'Types – Pokédex' })

const { data } = await useAsyncData('types', async () => {
  const typeIndex = await getTypeIndex()
  return typeIndex.list.map((t) => ({ name: t.name, en: enName(t) }))
})
</script>

<template>
  <div>
    <h1>Types</h1>
    <ul class="types-grid">
      <li v-for="t in data ?? []" :key="t.name">
        <NuxtLink :to="`/types/${t.name}`" class="type-tile" :class="`type-${t.name}`">{{ t.en }}</NuxtLink>
      </li>
    </ul>
  </div>
</template>
