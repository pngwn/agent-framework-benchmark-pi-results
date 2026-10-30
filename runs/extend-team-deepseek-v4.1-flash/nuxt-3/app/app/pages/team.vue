<script setup lang="ts">
interface TeamMember {
  id: number;
  name: string;
  sprite: string;
  types: { name: string; label: string }[];
}
interface CoverageRow {
  name: string;
  label: string;
  weak: number;
  resistant: number;
}
interface TeamData {
  members: TeamMember[];
  coverage: CoverageRow[];
}

const { names, remove } = useTeam();
usePageTitle('Team');

const { data, error } = await useFetch<TeamData>('/api/team', {
  key: 'team',
  query: computed(() => ({ names: names.value.join(',') })),
  watch: [names],
});
if (error.value || !data.value) {
  throw createError({ statusCode: error.value?.statusCode ?? 500, statusMessage: 'Something went wrong', fatal: true });
}

// Show the list in team order, and reflect removals immediately.
const members = computed(() =>
  names.value
    .map((name) => data.value?.members.find((member) => member.name === name))
    .filter((member): member is TeamMember => Boolean(member)),
);
const coverage = computed(() => data.value?.coverage ?? []);
</script>

<template>
  <h1>Team</h1>
  <p class="count">{{ names.length }} of 6</p>

  <template v-if="names.length">
    <ul class="card-grid">
      <li v-for="member in members" :key="member.name" class="team-card">
        <PokemonCard v-bind="member" />
        <button type="button" class="team-card__remove" @click="remove(member.name)">
          Remove {{ humanize(member.name) }}
        </button>
      </li>
    </ul>

    <PageSection title="Type coverage">
      <div class="table-scroll">
        <table class="coverage-table">
          <thead>
            <tr>
              <th scope="col">Type</th>
              <th scope="col">Weak</th>
              <th scope="col">Resistant</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in coverage" :key="row.name">
              <th scope="row">{{ row.label }}</th>
              <td>{{ row.weak }}</td>
              <td>{{ row.resistant }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </PageSection>
  </template>

  <template v-else>
    <p class="empty">Your team is empty</p>
    <p><NuxtLink to="/">Browse Pokémon</NuxtLink></p>
  </template>
</template>
