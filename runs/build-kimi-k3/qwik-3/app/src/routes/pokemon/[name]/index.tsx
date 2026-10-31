import { component$ } from "@builder.io/qwik";
import {
  routeLoader$,
  useLocation,
  useNavigate,
  type DocumentHead,
} from "@builder.io/qwik-city";
import {
  apiFetch,
  getTypes,
  getVersionGroups,
  typeLabel,
} from "../../../lib/api";
import {
  dexNumber,
  englishName,
  humanize,
  latestEnglishFlavor,
} from "../../../lib/format";
import {
  EvolutionTree,
  type EvoNode,
} from "../../../components/evolution";
import { MoveTable, type MoveRow } from "../../../components/move-table";
import { NotFound, Section, TypeBadgeLink } from "../../../components/ui";

const STAT_LABELS: Record<string, string> = {
  hp: "HP",
  attack: "Attack",
  defense: "Defense",
  "special-attack": "Sp. Atk",
  "special-defense": "Sp. Def",
  speed: "Speed",
};

const METHOD_ORDER = ["level-up", "machine", "egg", "tutor"];

export const usePokemon = routeLoader$(async (ev) => {
  const species = await apiFetch(
    `pokemon-species/${ev.params.name.toLowerCase()}/`,
  );
  if (!species) {
    ev.status(404);
    return null;
  }
  const variety =
    (species.varieties ?? []).find((v: any) => v.is_default) ??
    species.varieties?.[0];
  const pokemon = variety ? await apiFetch(variety.pokemon.url) : null;
  if (!pokemon) {
    ev.status(404);
    return null;
  }

  const [chain, types, versionGroups] = await Promise.all([
    species.evolution_chain?.url ? apiFetch(species.evolution_chain.url) : null,
    getTypes(),
    getVersionGroups(),
  ]);

  // Version groups in which this Pokémon learns moves, ordered by `order`.
  const orderByName = new Map(versionGroups.map((g) => [g.name, g.order]));
  const gameNames = [
    ...new Set<string>(
      pokemon.moves.flatMap((m: any) =>
        m.version_group_details.map((v: any) => String(v.version_group.name)),
      ),
    ),
  ];
  gameNames.sort(
    (a, b) => (orderByName.get(a) ?? 0) - (orderByName.get(b) ?? 0),
  );
  const requested = ev.query.get("game") ?? "";
  const selectedGame = gameNames.includes(requested)
    ? requested
    : (gameNames[gameNames.length - 1] ?? "");

  // Moves for the selected game, grouped by learn method.
  const byMethod = new Map<string, { move: string; level: number }[]>();
  for (const m of pokemon.moves) {
    for (const v of m.version_group_details) {
      if (v.version_group.name !== selectedGame) continue;
      const arr = byMethod.get(v.move_learn_method.name) ?? [];
      arr.push({ move: m.move.name, level: v.level_learned_at ?? 0 });
      byMethod.set(v.move_learn_method.name, arr);
    }
  }
  const moveNames = [
    ...new Set([...byMethod.values()].flat().map((r) => r.move)),
  ];
  const moveRecs = await Promise.all(moveNames.map((n) => apiFetch(`move/${n}/`)));
  const recByName = new Map(moveNames.map((n, i) => [n, moveRecs[i]]));

  const tables = [...byMethod.entries()].map(([method, rows]) => {
    const withLevel = method === "level-up";
    const out: MoveRow[] = rows.map((r) => {
      const rec = recByName.get(r.move);
      return {
        level: r.level,
        moveName: r.move,
        moveLabel: englishName(rec?.names) ?? humanize(r.move),
        typeName: rec?.type?.name ?? "",
        typeLabel: rec?.type?.name ? typeLabel(types, rec.type.name) : "—",
        category: rec?.damage_class?.name
          ? humanize(rec.damage_class.name)
          : "—",
        power: rec?.power ?? null,
        accuracy: rec?.accuracy ?? null,
        pp: rec?.pp ?? null,
      };
    });
    out.sort((a, b) =>
      withLevel
        ? a.level - b.level || a.moveLabel.localeCompare(b.moveLabel)
        : a.moveLabel.localeCompare(b.moveLabel),
    );
    return { method, label: humanize(method), withLevel, rows: out };
  });
  tables.sort((a, b) => {
    const ia = METHOD_ORDER.indexOf(a.method);
    const ib = METHOD_ORDER.indexOf(b.method);
    return (
      (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib) ||
      a.label.localeCompare(b.label)
    );
  });

  const stats = (pokemon.stats ?? []).map((s: any) => ({
    label: STAT_LABELS[s.stat.name] ?? humanize(s.stat.name),
    value: Number(s.base_stat),
  }));
  const toTree = (node: any): EvoNode => ({
    name: String(node.species.name),
    children: (node.evolves_to ?? []).map(toTree),
  });

  return {
    speciesName: String(species.name),
    name: englishName(species.names) ?? humanize(species.name),
    dex: Number(species.id),
    genus:
      species.genera?.find((g: any) => g.language?.name === "en")?.genus ?? "",
    flavor: latestEnglishFlavor(species.flavor_text_entries) ?? "",
    types: (pokemon.types ?? [])
      .sort((a: any, b: any) => a.slot - b.slot)
      .map((t: any) => ({
        name: String(t.type.name),
        label: typeLabel(types, t.type.name),
      })),
    height: (pokemon.height / 10).toFixed(1),
    weight: (pokemon.weight / 10).toFixed(1),
    stats,
    total: stats.reduce((sum: number, s: { value: number }) => sum + s.value, 0),
    abilities: (pokemon.abilities ?? [])
      .sort((a: any, b: any) => a.slot - b.slot)
      .map((a: any) => ({
        name: String(a.ability.name),
        hidden: Boolean(a.is_hidden),
      })),
    evolution: chain ? toTree(chain.chain) : null,
    artwork:
      pokemon.sprites?.other?.["official-artwork"]?.front_default ??
      pokemon.sprites?.front_default ??
      null,
    games: gameNames.map((n) => ({ name: n, label: humanize(n) })),
    selectedGame,
    tables,
  };
});

export default component$(() => {
  const data = usePokemon().value;
  const nav = useNavigate();
  const loc = useLocation();

  if (!data) return <NotFound />;

  return (
    <>
      <div class="panel hero">
        {data.artwork && (
          <img
            class="artwork"
            src={data.artwork}
            alt={data.name}
            width={288}
            height={288}
          />
        )}
        <div class="hero-info">
          <p class="hero-dex">{dexNumber(data.dex)}</p>
          <h1>{data.name}</h1>
          <p class="genus">{data.genus}</p>
          <p class="badges">
            {data.types.map((t) => (
              <TypeBadgeLink key={t.name} name={t.name} label={t.label} />
            ))}
          </p>
          <dl class="facts">
            <div>
              <dt>Height</dt>
              <dd>{data.height} m</dd>
            </div>
            <div>
              <dt>Weight</dt>
              <dd>{data.weight} kg</dd>
            </div>
          </dl>
          <p class="flavor">{data.flavor}</p>
        </div>
      </div>

      <Section title="Base stats">
        <table class="stats-table">
          <tbody>
            {data.stats.map((s) => (
              <tr key={s.label}>
                <th scope="row">{s.label}</th>
                <td class="num">{s.value}</td>
                <td class="bar">
                  <div class="stat-track">
                    <div
                      class="stat-fill"
                      style={{
                        width: `${Math.min(100, Math.round((s.value / 200) * 100))}%`,
                      }}
                    />
                  </div>
                </td>
              </tr>
            ))}
            <tr>
              <th scope="row">Total</th>
              <td class="num">{data.total}</td>
              <td class="bar">
                <div class="stat-track">
                  <div
                    class="stat-fill"
                    style={{
                      width: `${Math.min(100, Math.round((data.total / 700) * 100))}%`,
                    }}
                  />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </Section>

      <Section title="Abilities">
        <ul class="plain-list">
          {data.abilities.map((a) => (
            <li key={a.name}>
              <a href={`/abilities/${a.name}`}>{humanize(a.name)}</a>
              {a.hidden ? " (hidden)" : ""}
            </li>
          ))}
        </ul>
      </Section>

      {data.evolution && (
        <Section title="Evolution">
          <ul class="plain-list evo-tree">
            <EvolutionTree node={data.evolution} />
          </ul>
        </Section>
      )}

      <Section title="Moves" id="moves">
        <div class="game-picker">
          <label for="game-select">Game</label>
          <select
            id="game-select"
            onChange$={async (_e, el) => {
              await nav(
                `${loc.url.pathname}?game=${encodeURIComponent(el.value)}`,
              );
            }}
          >
            {data.games.map((g) => (
              <option
                key={g.name}
                value={g.name}
                selected={data.selectedGame === g.name}
              >
                {g.label}
              </option>
            ))}
          </select>
        </div>
        {data.tables.map((t) => (
          <MoveTable
            key={t.method}
            label={t.label}
            withLevel={t.withLevel}
            rows={t.rows}
          />
        ))}
      </Section>
    </>
  );
});

export const head: DocumentHead = ({ resolveValue }) => {
  const data = resolveValue(usePokemon);
  return { title: data ? `${data.name} – Pokédex` : "Not found – Pokédex" };
};
