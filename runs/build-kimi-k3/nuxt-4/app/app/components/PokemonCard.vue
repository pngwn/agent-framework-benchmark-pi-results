<script setup lang="ts">
import type { SpeciesTypeSlot } from '~/lib/pokeapi'

const props = defineProps<{
  id: number
  name: string
  human: string
  types?: SpeciesTypeSlot[]
  hidden?: boolean
}>()

const base = useApiBase()
const dex = computed(() => `#${String(props.id).padStart(4, '0')}`)
</script>

<template>
  <li class="card">
    <NuxtLink :to="`/pokemon/${name}`" class="card-link">
      <img :src="`${base}/media/sprites/pokemon/${id}.png`" :alt="human" width="96" height="96" />
      <span class="card-dex">{{ dex }}</span>
      <span class="card-name">{{ human }}</span>
      <span v-if="types && types.length" class="badges">
        <span v-for="t in types" :key="t.name" class="badge" :style="{ backgroundColor: `var(--type-${t.name})` }">
          {{ t.english }}
        </span>
      </span>
    </NuxtLink>
    <span v-if="hidden" class="hidden-ability">Hidden ability</span>
  </li>
</template>
