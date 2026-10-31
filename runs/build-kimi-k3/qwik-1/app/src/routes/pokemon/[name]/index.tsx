import { component$ } from '@builder.io/qwik';
import { routeLoader$, useNavigate, type DocumentHead } from '@builder.io/qwik-city';
import { apiFetch, apiPathOf, idFromUrl, spriteUrl } from '../../../lib/api';
import { getTypes } from '../../../lib/data';
import {
  collapseWhitespace,
  dexNumber,
  EM_DASH,
  englishName,
  humanize,
} from '../../../lib/format';
import { MovesTable, type MoveRow } from '../../../components/moves-table';
import { NotFound } from '../../../components/not-found';

const STAT_LABELS: Record<string, string> = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  'special-attack': 'Sp. Atk',
  'special-defense': 'Sp. Def',
  speed: 'Speed',
};

const METHOD_ORDER = ['level-up', 'machine', 'egg', 'tutor'];

interface EvoNodeData {
  name: string;
  human: string;
  children: EvoNodeData[];
}

export const usePokemonData = routeLoader$(async ({ params, query, status }) => {
  const species = await apiFetch(`/pokemon-species/${encodeURIComponent(params.name.toLowerCase())}/`);
  if (!species) {
    status(404);
    return null;
  }

  const defaultVariety =
    species.varieties.find((v: any) => v.is_default) ?? species.varieties[0];
  const pokemon = await apiFetch(apiPathOf(defaultVariety.pokemon.url));
  if (!pokemon) {
    status(404);
    return null;
  }

  const types = await getTypes();
  const typeEn = new Map(types.map((t) => [t.name, t.en]));
  const enType = (name: string) => typeEn.get(name) ?? humanize(name);

  // Evolution chain
  const chain = await apiFetch(apiPathOf(species.evolution_chain.url));
  const toNode = (n: any): EvoNodeData => ({
    name: n.species.name,
    human: humanize(n.species.name),
    children: (n.evolves_to ?? []).map(toNode),
  });
  const evolution = chain ? toNode(chain.chain) : null;

  // Version groups in which this Pokémon learns moves, ordered by `order`.
  const vgIds = new Set<number>();
  for (const m of pokemon.moves) {
    for (const vgd of m.version_group_details) vgIds.add(idFromUrl(vgd.version_group.url));
  }
  const vgRecords = (await Promise.all([...vgIds].map((id) => apiFetch(`/version-group/${id}/`)))).filter(
    Boolean,
  );
  vgRecords.sort((a, b) => a.order - b.order);

  const requested = query.get('game');
  const selected =
    vgRecords.find((v) => v.name === requested) ?? vgRecords[vgRecords.length - 1] ?? null;

  // Moves for the selected version group, grouped by learn method.
  let tables: Array<{ method: string; caption: string; showLevel: boolean; rows: MoveRow[] }> = [];
  if (selected) {
    const byMethod = new Map<string, Map<string, { move: string; level: number | null }>>();
    for (const m of pokemon.moves) {
      for (const vgd of m.version_group_details) {
        if (vgd.version_group.name !== selected.name) continue;
        const method: string = vgd.move_learn_method.name;
        const level = method === 'level-up' ? vgd.level_learned_at : null;
        let rows = byMethod.get(method);
        if (!rows) byMethod.set(method, (rows = new Map()));
        const key = `${m.move.name}|${level}`;
        if (!rows.has(key)) rows.set(key, { move: m.move.name, level });
      }
    }

    const moveNames = new Set<string>();
    for (const rows of byMethod.values()) for (const r of rows.values()) moveNames.add(r.move);
    const moveRecords = new Map<string, any>();
    await Promise.all(
      [...moveNames].map(async (name) => {
        moveRecords.set(name, await apiFetch(`/move/${name}/`));
      }),
    );

    const methods = [...byMethod.keys()].sort((a, b) => {
      const ia = METHOD_ORDER.indexOf(a);
      const ib = METHOD_ORDER.indexOf(b);
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      return humanize(a).localeCompare(humanize(b));
    });

    tables = methods.map((method) => {
      const rows: MoveRow[] = [...byMethod.get(method)!.values()].map(({ move, level }) => {
        const rec = moveRecords.get(move);
        return {
          level,
          move,
          moveEn: englishName(rec?.names) ?? humanize(move),
          type: rec?.type?.name ?? '',
          typeEn: rec?.type?.name ? enType(rec.type.name) : EM_DASH,
          category: rec?.damage_class?.name ? humanize(rec.damage_class.name) : EM_DASH,
          power: rec?.power ?? null,
          accuracy: rec?.accuracy ?? null,
          pp: rec?.pp ?? null,
        };
      });
      if (method === 'level-up') {
        rows.sort(
          (a, b) => (a.level ?? 0) - (b.level ?? 0) || a.moveEn.localeCompare(b.moveEn),
        );
      } else {
        rows.sort((a, b) => a.moveEn.localeCompare(b.moveEn));
      }
      return {
        method,
        caption: humanize(method),
        showLevel: method === 'level-up',
        rows,
      };
    });
  }

  const enName = englishName(species.names) ?? humanize(species.name);
  const genus =
    species.genera.find((g: any) => g.language?.name === 'en')?.genus ?? null;
  const enFlavors = (species.flavor_text_entries ?? []).filter(
    (f: any) => f.language?.name === 'en',
  );
  const flavor = enFlavors.length
    ? collapseWhitespace(enFlavors[enFlavors.length - 1].flavor_text)
    : null;

  const stats = pokemon.stats.map((s: any) => ({
    label: STAT_LABELS[s.stat.name] ?? humanize(s.stat.name),
    value: s.base_stat,
  }));
  const total = stats.reduce((sum: number, s: { value: number }) => sum + s.value, 0);

  const artwork =
    pokemon.sprites?.other?.['official-artwork']?.front_default ??
    pokemon.sprites?.front_default ??
    spriteUrl(pokemon.id);

  return {
    speciesName: species.name,
    enName,
    dex: dexNumber(species.id),
    genus,
    flavor,
    types: [...pokemon.types]
      .sort((a: any, b: any) => a.slot - b.slot)
      .map((t: any) => ({ api: t.type.name, en: enType(t.type.name) })),
    artwork,
    height: `${(pokemon.height / 10).toFixed(1)} m`,
    weight: `${(pokemon.weight / 10).toFixed(1)} kg`,
    stats,
    total,
    abilities: [...pokemon.abilities]
      .sort((a: any, b: any) => a.slot - b.slot)
      .map((a: any) => ({
        name: a.ability.name,
        human: humanize(a.ability.name),
        hidden: a.is_hidden,
      })),
    evolution,
    games: vgRecords.map((v: any) => ({ api: v.name, human: humanize(v.name) })),
    selectedGame: selected?.name ?? '',
    tables,
  };
});

const EvoNode = component$<{ node: EvoNodeData }>(({ node }) => {
  return (
    <li>
      <a href={`/pokemon/${node.name}`}>{node.human}</a>
      {node.children.length > 0 && (
        <ul>
          {node.children.map((c) => (
            <EvoNode key={c.name} node={c} />
          ))}
        </ul>
      )}
    </li>
  );
});

export default component$(() => {
  const data = usePokemonData();
  const nav = useNavigate();
  const d = data.value;
  if (!d) return <NotFound />;

  const maxStat = Math.max(...d.stats.map((s) => s.value), d.total, 1);

  return (
    <>
      <div class="card poke-hero-card">
        <div class="poke-hero">
          <img class="artwork" src={d.artwork} alt={d.enName} width={288} height={288} />
          <div class="hero-info">
            <p class="hero-dex">{d.dex}</p>
            <h1>{d.enName}</h1>
            {d.genus && <p class="hero-genus">{d.genus}</p>}
            <div class="hero-types">
              {d.types.map((t) => (
                <a key={t.api} class={`type-badge type-${t.api}`} href={`/types/${t.api}`}>
                  {t.en}
                </a>
              ))}
            </div>
            <dl class="kv-list">
              <div>
                <dt>Height</dt>
                <dd>{d.height}</dd>
              </div>
              <div>
                <dt>Weight</dt>
                <dd>{d.weight}</dd>
              </div>
            </dl>
          </div>
        </div>
        {d.flavor && <p class="hero-flavor">{d.flavor}</p>}
      </div>

      <section class="card" aria-labelledby="stats-heading">
        <h2 id="stats-heading">Base stats</h2>
        <table class="stats-table">
          <tbody>
            {d.stats.map((s) => (
              <tr key={s.label}>
                <th scope="row">{s.label}</th>
                <td class="stat-value">{s.value}</td>
                <td>
                  <div class="stat-track">
                    <div class="stat-bar" style={`width: ${Math.round((s.value / maxStat) * 100)}%`} />
                  </div>
                </td>
              </tr>
            ))}
            <tr class="total">
              <th scope="row">Total</th>
              <td class="stat-value">{d.total}</td>
              <td>
                <div class="stat-track">
                  <div class="stat-bar" style={`width: ${Math.round((d.total / maxStat) * 100)}%`} />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section class="card" aria-labelledby="abilities-heading">
        <h2 id="abilities-heading">Abilities</h2>
        <ul class="link-list">
          {d.abilities.map((a) => (
            <li key={a.name}>
              <a href={`/abilities/${a.name}`}>{a.human}</a>
              {a.hidden && <span class="hidden-note"> (hidden)</span>}
            </li>
          ))}
        </ul>
      </section>

      {d.evolution && (
        <section class="card" aria-labelledby="evolution-heading">
          <h2 id="evolution-heading">Evolution</h2>
          <ul class="link-list evo-tree">
            <EvoNode node={d.evolution} />
          </ul>
        </section>
      )}

      <section class="card" id="moves" aria-labelledby="moves-heading">
        <h2 id="moves-heading">Moves</h2>
        {d.games.length > 0 && (
          <div class="game-picker">
            <label for="game">Game</label>
            <select
              id="game"
              onChange$={(_, el) => {
                nav(`/pokemon/${d.speciesName}?game=${el.value}#moves`);
              }}
            >
              {d.games.map((g) => (
                <option key={g.api} value={g.api} selected={g.api === d.selectedGame}>
                  {g.human}
                </option>
              ))}
            </select>
          </div>
        )}
        {d.tables.map((t) => (
          <MovesTable key={t.method} caption={t.caption} rows={t.rows} showLevel={t.showLevel} />
        ))}
      </section>
    </>
  );
});

export const head: DocumentHead = ({ resolveValue }) => {
  const d = resolveValue(usePokemonData);
  return { title: d ? `${d.enName} – Pokédex` : 'Not found – Pokédex' };
};
