<script setup lang="ts">
const props = defineProps<{
  pokemon: { id: number; name: string; humanized: string }
  types?: Array<{ name: string; label: string }>
  hidden?: boolean
}>()
</script>

<template>
  <li class="pokemon-card">
    <NuxtLink :to="`/pokemon/${props.pokemon.name}`" class="pokemon-card-link">
      <img
        class="pokemon-sprite"
        :src="`/media/sprites/pokemon/${props.pokemon.id}.png`"
        :alt="props.pokemon.humanized"
        width="96"
        height="96"
        loading="lazy"
      >
      <span class="pokemon-dex">{{ dexNumber(props.pokemon.id) }}</span>
      <span class="pokemon-name">{{ props.pokemon.humanized }}</span>
      <span v-if="props.types?.length" class="pokemon-card-types">
        <TypeBadge
          v-for="type in props.types"
          :key="type.name"
          :name="type.name"
          :label="type.label"
        />
      </span>
    </NuxtLink>
    <span v-if="props.hidden" class="hidden-ability">Hidden ability</span>
  </li>
</template>
