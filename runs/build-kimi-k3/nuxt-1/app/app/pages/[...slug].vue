<script setup>
useHead({ title: 'Not found – Pokédex' })
if (import.meta.server) setResponseStatus(404)
</script>

<template>
  <NotFound />
</template>
