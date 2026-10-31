<script setup lang="ts">
useHead({ title: 'Not found – Pokédex' })

const event = useRequestEvent()
if (event) event.node.res.statusCode = 404
</script>

<template>
  <div>
    <h1>Not found</h1>
    <p><NuxtLink to="/">Back to the Pokédex</NuxtLink></p>
  </div>
</template>
