<script setup lang="ts">
import type { ChainNode } from '~/components/EvolutionNode.vue';
import type { MoveRow } from '~/components/MovesTable.vue';

interface MoveInfo {
  label: string;
  type: string;
  category: string | null;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
}
interface PokemonData {
  id: number;
  name: string;
  label: string;
  genus: string | null;
  flavorText: string | null;
  types: string[];
  typeLabels: Record<string, string>;
  artwork: string | null;
  height: number;
  weight: number;
  stats: { name: string; label: string; value: number }[];
  abilities: { name: string; label: string; hidden: boolean }[];
  evolution: ChainNode;
  games: { name: string; label: string }[];
  moves: Record<string, MoveInfo>;
  learnsets: Record<string, [string, string, number][]>;
}

const METHOD_ORDER = ['level-up', 'machine', 'egg', 'tutor'];
const MAX_STAT = 255;

const route = useRoute();
const router = useRouter();
const name = computed(() => String(route.params.name));
const pokemon = await usePageData<PokemonData>(
  () => `/api/pokemon/${encodeURIComponent(name.value)}`,
  () => `pokemon:${name.value}`,
);
usePageTitle(() => pokemon.value?.label);

const { has, isFull, add, remove } = useTeam();
const inTeam = computed(() => has(pokemon.value.name));
const teamFull = computed(() => isFull.value && !inTeam.value);
function toggleTeam() {
  if (inTeam.value) remove(pokemon.value.name);
  else add(pokemon.value.name);
}

const total = computed(() => pokemon.value.stats.reduce((sum, s) => sum + s.value, 0));
const barWidth = (value: number, max: number) => `${Math.min(100, (value / max) * 100).toFixed(1)}%`;

const defaultGame = computed(() => pokemon.value.games[pokemon.value.games.length - 1]?.name ?? '');
const game = computed(() => {
  const requested = String(route.query.game ?? '');
  return pokemon.value.games.some((g) => g.name === requested) ? requested : defaultGame.value;
});
function selectGame(value: string) {
  router.replace({ query: { ...route.query, game: value }, hash: route.hash });
}

const tables = computed(() => {
  const byMethod = new Map<string, Map<string, MoveRow>>();
  for (const [move, method, level] of pokemon.value.learnsets[game.value] ?? []) {
    const info = pokemon.value.moves[move];
    if (!info) continue;
    if (!byMethod.has(method)) byMethod.set(method, new Map());
    const rowLevel = method === 'level-up' ? level : null;
    const key = `${move}:${rowLevel}`;
    byMethod.get(method)!.set(key, {
      name: move,
      label: info.label,
      level: rowLevel,
      type: info.type,
      typeLabel: pokemon.value.typeLabels[info.type] ?? humanize(info.type),
      category: info.category,
      power: info.power,
      accuracy: info.accuracy,
      pp: info.pp,
    });
  }
  const rank = (m: string) => {
    const i = METHOD_ORDER.indexOf(m);
    return i === -1 ? METHOD_ORDER.length : i;
  };
  return [...byMethod.entries()]
    .map(([method, rows]) => ({
      method,
      caption: humanize(method),
      rows: [...rows.values()].sort(
        (a, b) => (method === 'level-up' ? (a.level ?? 0) - (b.level ?? 0) : 0) || a.label.localeCompare(b.label),
      ),
    }))
    .sort((a, b) => rank(a.method) - rank(b.method) || a.caption.localeCompare(b.caption));
});
</script>

<template>
  <div class="summary">
    <div class="summary__art">
      <img
        v-if="pokemon.artwork"
        :src="pokemon.artwork"
        :alt="pokemon.label"
        width="288"
        height="288"
        fetchpriority="high"
      />
    </div>
    <div class="summary__body">
      <p class="summary__dex">{{ dexNumber(pokemon.id) }}</p>
      <h1>{{ pokemon.label }}</h1>
      <p v-if="pokemon.genus" class="summary__genus">{{ pokemon.genus }}</p>
      <ul class="badge-list" aria-label="Types">
        <li v-for="t in pokemon.types" :key="t">
          <TypeBadge :name="t" :label="pokemon.typeLabels[t] ?? humanize(t)" link />
        </li>
      </ul>
      <dl class="measures">
        <div>
          <dt>Height</dt>
          <dd>{{ (pokemon.height / 10).toFixed(1) }} m</dd>
        </div>
        <div>
          <dt>Weight</dt>
          <dd>{{ (pokemon.weight / 10).toFixed(1) }} kg</dd>
        </div>
      </dl>
      <p v-if="pokemon.flavorText" class="summary__flavor">{{ pokemon.flavorText }}</p>
    </div>
  </div>

  <div class="team-action">
    <button type="button" class="button" :disabled="teamFull" @click="toggleTeam">
      {{ inTeam ? 'Remove from team' : 'Add to team' }}
    </button>
    <span v-if="teamFull" class="team-action__note">Team is full</span>
  </div>

  <PageSection title="Base stats">
    <table class="stats-table">
      <tbody>
        <tr v-for="s in pokemon.stats" :key="s.name">
          <th scope="row">{{ s.label }}</th>
          <td class="stats-table__value">{{ s.value }}</td>
          <td class="stats-table__bar">
            <div class="bar"><div class="bar__fill" :style="{ width: barWidth(s.value, MAX_STAT) }" /></div>
          </td>
        </tr>
        <tr class="stats-table__total">
          <th scope="row">Total</th>
          <td class="stats-table__value">{{ total }}</td>
          <td class="stats-table__bar">
            <div class="bar">
              <div class="bar__fill" :style="{ width: barWidth(total, MAX_STAT * Math.max(1, pokemon.stats.length)) }" />
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </PageSection>

  <PageSection title="Abilities">
    <ul class="plain-list">
      <li v-for="a in pokemon.abilities" :key="a.name">
        <NuxtLink :to="`/abilities/${a.name}`">{{ a.label }}</NuxtLink>
        <template v-if="a.hidden"> (hidden)</template>
      </li>
    </ul>
  </PageSection>

  <PageSection title="Evolution">
    <ul class="evolution">
      <EvolutionNode :node="pokemon.evolution" :current="pokemon.name" />
    </ul>
  </PageSection>

  <PageSection id="moves" title="Moves">
    <template v-if="pokemon.games.length">
      <div class="field field--inline">
        <label for="game">Game</label>
        <select id="game" :value="game" @change="selectGame(($event.target as HTMLSelectElement).value)">
          <option v-for="g in pokemon.games" :key="g.name" :value="g.name" :selected="g.name === game">
            {{ g.label }}
          </option>
        </select>
      </div>
      <MovesTable
        v-for="t in tables"
        :key="`${game}:${t.method}`"
        :caption="t.caption"
        :rows="t.rows"
        :show-level="t.method === 'level-up'"
      />
    </template>
    <p v-else>—</p>
  </PageSection>
</template>
