<script setup lang="ts">
const props = defineProps<{
  id: number
  name: string
  types?: string[]
  hidden?: boolean
}>()

const apiBase = useRuntimeConfig().public.apiBaseUrl
const label = computed(() => humanize(props.name))
</script>

<template>
  <NuxtLink :to="`/pokemon/${name}`" class="card">
    <img
      :src="`${apiBase}/media/sprites/pokemon/${id}.png`"
      :alt="label"
      width="96"
      height="96"
    >
    <span class="card-dex">{{ dexNumber(id) }}</span>
    <span class="card-name">{{ label }}</span>
    <span v-if="types?.length" class="card-types">
      <span v-for="t in types" :key="t" class="type-badge" :class="`type-${t}`">{{ humanize(t) }}</span>
    </span>
    <span v-if="hidden" class="card-hidden">Hidden ability</span>
  </NuxtLink>
</template>
