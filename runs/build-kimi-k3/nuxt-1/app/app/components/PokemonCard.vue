<script setup>
import { dexNumber } from '#shared/utils/format'

const props = defineProps({
  id: { type: Number, required: true },
  name: { type: String, required: true },
  label: { type: String, required: true },
  sprite: { type: String, required: true },
  types: { type: Array, default: () => [] }, // [{ name, en }]
  hidden: { type: Boolean, default: false },
})


</script>

<template>
  <li class="card">
    <NuxtLink :to="`/pokemon/${name}`" class="card-link">
      <img class="card-sprite" :src="sprite" alt="" width="96" height="96" loading="lazy" />
      <span class="card-number">{{ dexNumber(id) }}</span>
      <span class="card-name">{{ label }}</span>
      <span v-if="types.length" class="card-types">
        <span v-for="t in types" :key="t.name" class="type-badge" :class="`type-${t.name}`">{{ t.en }}</span>
      </span>
      <span v-if="hidden" class="card-hidden">Hidden ability</span>
    </NuxtLink>
  </li>
</template>
