<script setup lang="ts">
interface TeamData {
  members: {
    id: number;
    name: string;
    sprite: string;
    types: { name: string; label: string }[];
  }[];
  coverage: { name: string; label: string; weak: number; resistant: number }[];
}

const { members, remove } = useTeam();
const names = computed(() => members.value.join(','));
const memberNames = computed(() => new Set(members.value));

const { data } = await useAsyncData<TeamData>(
  'team',
  () => $fetch('/api/team', { query: { names: names.value } }),
  { watch: [names] },
);

const shownMembers = computed(() =>
  (data.value?.members ?? []).filter((member) => memberNames.value.has(member.name)),
);

usePageTitle('Team');
</script>

<template>
  <h1>Team</h1>
  <p class="count">{{ members.length }} of 6</p>

  <template v-if="members.length">
    <ul class="card-grid team-grid">
      <li v-for="member in shownMembers" :key="member.id" class="team-card">
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
            <tr v-for="row in data?.coverage ?? []" :key="row.name">
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
    <p>Your team is empty</p>
    <p><NuxtLink to="/">Browse Pokémon</NuxtLink></p>
  </template>
</template>
