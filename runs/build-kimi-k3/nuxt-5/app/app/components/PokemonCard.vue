<script setup>
defineProps({
  id: { type: Number, required: true },
  name: { type: String, required: true },
  types: { type: Array, default: null },
  hidden: { type: Boolean, default: false },
})
</script>

<template>
  <li class="pokemon-card">
    <NuxtLink :to="`/pokemon/${name}`" class="pokemon-card-link">
      <img
        class="pokemon-card-sprite"
        :src="spriteUrl(id)"
        :alt="humanize(name)"
        width="96"
        height="96"
        loading="lazy"
      >
      <span class="pokemon-card-dex">{{ dexNumber(id) }}</span>
      <span class="pokemon-card-name">{{ humanize(name) }}</span>
      <span v-if="types && types.length" class="pokemon-card-types">
        <span v-for="t in types" :key="t.name" class="type-badge" :class="`type-${t.name}`">{{ t.en }}</span>
      </span>
      <span v-if="hidden" class="pokemon-card-hidden">Hidden ability</span>
    </NuxtLink>
  </li>
</template>
