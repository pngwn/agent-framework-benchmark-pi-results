<script setup lang="ts">
interface MoveData {
  name: string;
  label: string;
  type: { name: string; label: string };
  category: string | null;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
  effect: string | null;
  learnedBy: { id: number; name: string; sprite: string }[];
}
const route = useRoute();
const name = computed(() => String(route.params.name));
const move = await usePageData<MoveData>(
  () => `/api/moves/${encodeURIComponent(name.value)}`,
  () => `move:${name.value}`,
);
usePageTitle(() => move.value?.label);
</script>

<template>
  <h1>{{ move.label }}</h1>
  <dl class="panel facts">
    <div>
      <dt>Type</dt>
      <dd><TypeBadge :name="move.type.name" :label="move.type.label" link /></dd>
    </div>
    <div>
      <dt>Category</dt>
      <dd>{{ orDash(move.category) }}</dd>
    </div>
    <div>
      <dt>Power</dt>
      <dd>{{ orDash(move.power) }}</dd>
    </div>
    <div>
      <dt>Accuracy</dt>
      <dd>{{ orDash(move.accuracy) }}</dd>
    </div>
    <div>
      <dt>PP</dt>
      <dd>{{ orDash(move.pp) }}</dd>
    </div>
  </dl>
  <PageSection title="Effect">
    <p>{{ orDash(move.effect) }}</p>
  </PageSection>
  <PageSection title="Learned by">
    <p class="count">{{ move.learnedBy.length }} Pokémon</p>
    <CardList :cards="move.learnedBy" />
  </PageSection>
</template>
