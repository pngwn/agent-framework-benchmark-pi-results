<script setup>
defineProps({
  name: { type: String, required: true },
  label: { type: String, required: true },
})
</script>

<template>
  <NuxtLink :to="`/types/${name}`" class="type-badge" :class="`type-${name}`">{{ label }}</NuxtLink>
</template>
