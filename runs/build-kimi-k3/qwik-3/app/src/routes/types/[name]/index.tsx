import { component$ } from "@builder.io/qwik";
import { routeLoader$, type DocumentHead } from "@builder.io/qwik-city";
import {
  apiFetch,
  getSpeciesNameById,
  getTypes,
  spriteBase,
  toSpeciesCards,
  typeLabel,
} from "../../../lib/api";
import { englishName, humanize } from "../../../lib/format";
import {
  NotFound,
  PokemonCardList,
  Section,
  TypeBadgeLink,
} from "../../../components/ui";

export const useType = routeLoader$(async (ev) => {
  const type = await apiFetch(`type/${ev.params.name.toLowerCase()}/`);
  if (!type) {
    ev.status(404);
    return null;
  }
  const [types, speciesNames] = await Promise.all([
    getTypes(),
    getSpeciesNameById(),
  ]);
  const rel = (list: any[]) =>
    (list ?? []).map((r: any) => ({
      name: String(r.name),
      label: typeLabel(types, r.name),
    }));
  const dr = type.damage_relations ?? {};
  return {
    name: englishName(type.names) ?? humanize(type.name),
    relations: [
      { term: "Super effective against", items: rel(dr.double_damage_to) },
      { term: "Not very effective against", items: rel(dr.half_damage_to) },
      { term: "No effect against", items: rel(dr.no_damage_to) },
      { term: "Weak to", items: rel(dr.double_damage_from) },
      { term: "Resists", items: rel(dr.half_damage_from) },
      { term: "Immune to", items: rel(dr.no_damage_from) },
    ],
    pokemon: toSpeciesCards(
      (type.pokemon ?? []).map((p: any) => p.pokemon),
      speciesNames,
    ),
    moves: (type.moves ?? [])
      .map((m: any) => ({ name: String(m.name), label: humanize(m.name) }))
      .sort((a: any, b: any) => a.label.localeCompare(b.label)),
    sprites: spriteBase(),
  };
});

export default component$(() => {
  const data = useType().value;
  if (!data) return <NotFound />;
  return (
    <>
      <h1>{data.name}</h1>
      <Section title="Damage relations">
        <dl class="relations">
          {data.relations.map((r) => (
            <div key={r.term}>
              <dt>{r.term}</dt>
              <dd>
                {r.items.length > 0
                  ? r.items.map((t) => (
                      <TypeBadgeLink
                        key={t.name}
                        name={t.name}
                        label={t.label}
                      />
                    ))
                  : "None"}
              </dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section title="Pokémon">
        <p class="count">{data.pokemon.length} Pokémon</p>
        <PokemonCardList items={data.pokemon} sprites={data.sprites} />
      </Section>

      <Section title="Moves">
        <p class="count">{data.moves.length} moves</p>
        <ul class="move-list">
          {data.moves.map((m: { name: string; label: string }) => (
            <li key={m.name}>
              <a href={`/moves/${m.name}`}>{m.label}</a>
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
});

export const head: DocumentHead = ({ resolveValue }) => {
  const data = resolveValue(useType);
  return { title: data ? `${data.name} – Pokédex` : "Not found – Pokédex" };
};
