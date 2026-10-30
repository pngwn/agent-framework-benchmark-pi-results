<script setup lang="ts">
const props = defineProps<{
  pokemon: Array<{
    id: number
    name: string
    humanized: string
    hidden?: boolean
  }>
  types?: boolean
  typeLookup?: Record<string, { name: string; label: string }>
}>()

const typesFor = (pokemon: any) => {
  if (!props.types || !pokemon.types) return undefined
  return pokemon.types.map((type: any) => {
    const name = typeof type === 'string' ? type : type.name
    return (
      props.typeLookup?.[name] ?? {
        name,
        label: humanize(name),
      }
    )
  })
}
</script>

<template>
  <ul class="card-grid">
    <PokemonCard
      v-for="entry in props.pokemon"
      :key="entry.id"
      :pokemon="entry"
      :types="typesFor(entry)"
      :hidden="entry.hidden"
    />
  </ul>
</template>
