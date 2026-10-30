<script setup lang="ts">
interface TeamMember {
  id: number;
  name: string;
  sprite: string;
  types: { name: string; label: string }[];
}
interface TeamData {
  members: TeamMember[];
  coverage: { name: string; label: string; weak: number; resistant: number }[];
}

usePageTitle('Team');
const { team, remove } = useTeam();
const names = computed(() => team.value.join(','));
const { data } = await useFetch<TeamData>('/api/team', {
  key: `team:${names.value}`,
  query: computed(() => ({ names: names.value })),
  watch: [team],
  default: () => ({ members: [], coverage: [] }),
});

const members = computed(() => data.value?.members ?? []);
const coverage = computed(() => data.value?.coverage ?? []);
</script>

<template>
  <h1>Team</h1>
  <p class="count">{{ team.length }} of 6</p>

  <template v-if="team.length">
    <ul class="card-grid team-grid">
      <li v-for="member in members" :key="member.name" class="team-grid__item">
        <PokemonCard v-bind="member" />
        <button type="button" class="button team-grid__remove" @click="remove(member.name)">
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
