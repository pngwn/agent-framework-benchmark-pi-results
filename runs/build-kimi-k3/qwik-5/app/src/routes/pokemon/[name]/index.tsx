import { component$ } from '@builder.io/qwik';
import { routeLoader$, useNavigate, type DocumentHead } from '@builder.io/qwik-city';
import {
  apiGet,
  getTypeIndex,
  getVersionGroupIndex,
  idFromUrl,
  spriteUrl,
} from '../../../lib/api';
import {
  collapseWhitespace,
  dexNumber,
  englishName,
  humanize,
  latestEnglishFlavorText,
  orDash,
} from '../../../lib/format';
import { NotFound } from '../../../components/not-found';
import { TypeBadge } from '../../../components/pokemon-cards';
import { MovesTable, type MoveRow, type MoveTableData } from '../../../components/moves-table';

const STAT_LABELS: Record<string, string> = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  'special-attack': 'Sp. Atk',
  'special-defense': 'Sp. Def',
  speed: 'Speed',
};

const METHOD_ORDER = ['level-up', 'machine', 'egg', 'tutor'];

interface EvoNode {
  name: string;
  children: EvoNode[];
}

export const usePokemonData = routeLoader$(async ({ params, query, status }) => {
  const species = await apiGet(`pokemon-species/${encodeURIComponent(params.name.toLowerCase())}/`);
  if (!species) {
    status(404);
    return null;
  }
  const pokemon = await apiGet(`pokemon/${species.id}/`);
  if (!pokemon) {
    status(404);
    return null;
  }

  const [typeIndex, versionGroups, chain] = await Promise.all([
    getTypeIndex(),
    getVersionGroupIndex(),
    species.evolution_chain?.url ? apiGet(`evolution-chain/${idFromUrl(species.evolution_chain.url)}/`) : null,
  ]);

  const typeLabel = (name: string) => typeIndex.byName.get(name)?.label ?? humanize(name);

  // --- Moves -------------------------------------------------------------
  const gameNames = new Set<string>();
  for (const move of pokemon.moves ?? []) {
    for (const detail of move.version_group_details ?? []) {
      gameNames.add(detail.version_group.name);
    }
  }
  const games = [...gameNames]
    .map((name) => ({ name, label: humanize(name), order: versionGroups.get(name)?.order ?? 0 }))
    .sort((a, b) => a.order - b.order);

  let selectedGame = query.get('game') ?? '';
  if (!games.some((g) => g.name === selectedGame)) {
    selectedGame = games.length ? games[games.length - 1].name : '';
  }

  // Collect (move, method, level) for the selected game.
  const seen = new Map<string, { moveName: string; method: string; level: number }>();
  for (const move of pokemon.moves ?? []) {
    for (const detail of move.version_group_details ?? []) {
      if (detail.version_group.name !== selectedGame) continue;
      const key = `${move.move.name}::${detail.move_learn_method.name}`;
      const prev = seen.get(key);
      const level = detail.level_learned_at ?? 0;
      if (!prev || level < prev.level) {
        seen.set(key, { moveName: move.move.name, method: detail.move_learn_method.name, level });
      }
    }
  }

  const uniqueMoveNames = [...new Set([...seen.values()].map((e) => e.moveName))];
  const moveRecords: any[] = await Promise.all(uniqueMoveNames.map((n) => apiGet(`move/${n}/`)));
  const moveByName = new Map<string, any>();
  for (const rec of moveRecords) if (rec) moveByName.set(rec.name, rec);

  const byMethod = new Map<string, MoveRow[]>();
  for (const entry of seen.values()) {
    const rec = moveByName.get(entry.moveName);
    if (!rec) continue;
    const row: MoveRow = {
      level: entry.level,
      moveName: rec.name,
      moveLabel: englishName(rec.names) ?? humanize(rec.name),
      typeName: rec.type?.name ?? '',
      typeLabel: rec.type?.name ? typeLabel(rec.type.name) : '—',
      category: rec.damage_class?.name ? humanize(rec.damage_class.name) : '—',
      power: rec.power ?? null,
      accuracy: rec.accuracy ?? null,
      pp: rec.pp ?? null,
    };
    let arr = byMethod.get(entry.method);
    if (!arr) byMethod.set(entry.method, (arr = []));
    arr.push(row);
  }

  const methods = [...byMethod.keys()].sort((a, b) => {
    const ia = METHOD_ORDER.indexOf(a);
    const ib = METHOD_ORDER.indexOf(b);
    if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    return humanize(a).localeCompare(humanize(b));
  });

  const moveTables: MoveTableData[] = methods.map((method) => {
    const rows = byMethod.get(method)!;
    if (method === 'level-up') {
      rows.sort((a, b) => a.level! - b.level! || a.moveLabel.localeCompare(b.moveLabel));
    } else {
      rows.sort((a, b) => a.moveLabel.localeCompare(b.moveLabel));
    }
    return { caption: humanize(method), showLevel: method === 'level-up', rows };
  });

  // --- Evolution chain ----------------------------------------------------
  const toNode = (link: any): EvoNode => ({
    name: link.species.name,
    children: (link.evolves_to ?? []).map(toNode),
  });
  const evolution: EvoNode | null = chain?.chain ? toNode(chain.chain) : null;

  // --- Summary ------------------------------------------------------------
  const stats = (pokemon.stats ?? []).map((s: any) => ({
    label: STAT_LABELS[s.stat?.name] ?? humanize(s.stat?.name ?? ''),
    value: s.base_stat as number,
  }));
  const total = stats.reduce((sum: number, s: { value: number }) => sum + s.value, 0);

  const genera = species.genera ?? [];
  const genus = genera.find((g: any) => g.language?.name === 'en')?.genus ?? null;

  const artwork =
    pokemon.sprites?.other?.['official-artwork']?.front_default ?? pokemon.sprites?.front_default ?? spriteUrl(pokemon.id);

  return {
    speciesName: species.name as string,
    name: englishName(species.names) ?? humanize(species.name),
    dex: dexNumber(species.id),
    genus,
    flavorText: latestEnglishFlavorText(species.flavor_text_entries),
    artwork,
    types: (pokemon.types ?? [])
      .slice()
      .sort((a: any, b: any) => a.slot - b.slot)
      .map((t: any) => ({ name: t.type.name as string, label: typeLabel(t.type.name) })),
    height: `${(pokemon.height / 10).toFixed(1)} m`,
    weight: `${(pokemon.weight / 10).toFixed(1)} kg`,
    stats,
    total,
    abilities: (pokemon.abilities ?? [])
      .slice()
      .sort((a: any, b: any) => a.slot - b.slot)
      .map((a: any) => ({
        name: a.ability.name as string,
        label: humanize(a.ability.name),
        hidden: !!a.is_hidden,
      })),
    evolution,
    games,
    selectedGame,
    moveTables,
  };
});

export const EvoTree = component$<{ node: EvoNode }>(({ node }) => {
  return (
    <li>
      <a href={`/pokemon/${node.name}`}>{humanize(node.name)}</a>
      {node.children.length > 0 && (
        <ul>
          {node.children.map((child) => (
            <EvoTree key={child.name} node={child} />
          ))}
        </ul>
      )}
    </li>
  );
});

export default component$(() => {
  const data = usePokemonData();
  const nav = useNavigate();

  if (!data.value) {
    return <NotFound />;
  }
  const d = data.value;

  return (
    <>
      <div class="summary-card">
        <img class="artwork" src={d.artwork} alt={d.name} width={288} height={288} />
        <div class="summary-info">
          <span class="dex">{d.dex}</span>
          <h1>{d.name}</h1>
          {d.genus && <p class="genus">{d.genus}</p>}
          <div class="badges">
            {d.types.map((t) => (
              <TypeBadge key={t.name} type={t} link />
            ))}
          </div>
          <dl class="facts">
            <div>
              <dt>Height</dt>
              <dd>{d.height}</dd>
            </div>
            <div>
              <dt>Weight</dt>
              <dd>{d.weight}</dd>
            </div>
          </dl>
          {d.flavorText && <p>{d.flavorText}</p>}
        </div>
      </div>

      <section class="card-section" aria-labelledby="stats-heading">
        <h2 id="stats-heading">Base stats</h2>
        <table class="stats-table">
          <tbody>
            {d.stats.map((s) => (
              <tr key={s.label}>
                <th scope="row">{s.label}</th>
                <td class="value">{s.value}</td>
                <td>
                  <div class="stat-track">
                    <div class="stat-fill" style={{ width: `${Math.min(100, (s.value / 255) * 100)}%` }} />
                  </div>
                </td>
              </tr>
            ))}
            <tr>
              <th scope="row">Total</th>
              <td class="value">{d.total}</td>
              <td>
                <div class="stat-track">
                  <div class="stat-fill" style={{ width: `${Math.min(100, (d.total / 780) * 100)}%` }} />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section class="card-section" aria-labelledby="abilities-heading">
        <h2 id="abilities-heading">Abilities</h2>
        <ul class="link-list">
          {d.abilities.map((a) => (
            <li key={a.name}>
              <a href={`/abilities/${a.name}`}>{a.label}</a>
              {a.hidden && <span class="muted"> (hidden)</span>}
            </li>
          ))}
        </ul>
      </section>

      {d.evolution && (
        <section class="card-section" aria-labelledby="evolution-heading">
          <h2 id="evolution-heading">Evolution</h2>
          <ul class="link-list">
            <EvoTree node={d.evolution} />
          </ul>
        </section>
      )}

      <section class="card-section" aria-labelledby="moves-heading" id="moves">
        <h2 id="moves-heading">Moves</h2>
        {d.games.length > 0 && (
          <div class="game-picker field">
            <label for="game">Game</label>
            <select
              id="game"
              name="game"
              onChange$={(_, el) => {
                nav(`/pokemon/${d.speciesName}?game=${el.value}#moves`);
              }}
            >
              {d.games.map((g) => (
                <option key={g.name} value={g.name} selected={d.selectedGame === g.name}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>
        )}
        {d.moveTables.map((table) => (
          <MovesTable key={table.caption} table={table} />
        ))}
      </section>
    </>
  );
});

export const head: DocumentHead = ({ resolveValue }) => {
  const data = resolveValue(usePokemonData);
  return {
    title: data ? `${data.name} – Pokédex` : 'Not found – Pokédex',
  };
};
