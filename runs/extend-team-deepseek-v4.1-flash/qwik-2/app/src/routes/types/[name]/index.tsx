import { component$ } from "@builder.io/qwik";
import { Link, routeLoader$, type DocumentHead } from "@builder.io/qwik-city";
import { CardList, NotFound, Section, TypeBadge } from "~/components/ui";
import { typePage } from "~/lib/data";
import { pageTitle } from "~/lib/format";

export const useType = routeLoader$(async ({ params, status }) => {
  const data = await typePage(params.name);
  if (!data) status(404);
  return data;
});

export default component$(() => {
  const loader = useType();
  const type = loader.value;
  if (!type) return <NotFound />;
  return (
    <>
      <h1>{type.title}</h1>
      <Section id="relations" title="Damage relations">
        <dl class="relations">
          {type.relations.map((r) => (
            <div key={r.key} class="relation">
              <dt>{r.label}</dt>
              <dd>
                {r.types.length ? (
                  <span class="badges">
                    {r.types.map((t) => (
                      <TypeBadge key={t.name} type={t} link />
                    ))}
                  </span>
                ) : (
                  "None"
                )}
              </dd>
            </div>
          ))}
        </dl>
      </Section>
      <Section id="pokemon" title="Pokémon">
        <p class="count">{type.pokemon.length} Pokémon</p>
        <CardList cards={type.pokemon} />
      </Section>
      <Section id="moves" title="Moves">
        <p class="count">{type.moves.length} moves</p>
        <ul class="move-links">
          {type.moves.map((m) => (
            <li key={m.name}>
              <Link href={`/moves/${m.name}`}>{m.label}</Link>
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
});

export const head: DocumentHead = ({ resolveValue }) => {
  const type = resolveValue(useType);
  return { title: pageTitle(type ? type.title : "Not found") };
};
