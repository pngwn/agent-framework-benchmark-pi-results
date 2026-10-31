import { For, Show } from "solid-js";
import { Title } from "@solidjs/meta";
import { A, createAsync, useParams, useSearchParams } from "@solidjs/router";
import { pokemonQuery } from "~/lib/queries";
import { dexNumber, one } from "~/lib/format";
import Section from "~/components/Section";
import MovesSection from "~/components/MovesSection";
import NotFound from "~/components/NotFound";
import { TypeBadgeLink } from "~/components/Badge";

interface EvoNode {
  name: string;
  humanized: string;
  children: EvoNode[];
}

function EvoTree(props: { node: EvoNode }) {
  return (
    <li>
      <A href={`/pokemon/${props.node.name}`}>{props.node.humanized}</A>
      <Show when={props.node.children.length > 0}>
        <ul>
          <For each={props.node.children}>
            {(child) => <EvoTree node={child} />}
          </For>
        </ul>
      </Show>
    </li>
  );
}

const barWidth = (value: number, max: number) =>
  `${Math.min(100, Math.max(2, (value / max) * 100)).toFixed(1)}%`;

export default function PokemonPage() {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const data = createAsync(() => pokemonQuery(params.name ?? "", one(searchParams.game) ?? null));

  return (
    <Show when={data() !== undefined}>
      <Show when={data()} fallback={<NotFound />}>
        {(d) => (
          <main class="container">
            <Title>{d().en} – Pokédex</Title>
            <div class="hero">
              <div class="hero-art">
                <Show when={d().artwork}>
                  {(src) => <img src={src()} alt={d().en} width="288" height="288" />}
                </Show>
              </div>
              <div class="hero-info">
                <p class="dex">{dexNumber(d().id)}</p>
                <h1>{d().en}</h1>
                <Show when={d().genus}>
                  <p class="genus">{d().genus}</p>
                </Show>
                <p class="badges">
                  <For each={d().types}>
                    {(t) => <TypeBadgeLink name={t.name} label={t.en} />}
                  </For>
                </p>
                <dl class="facts">
                  <div>
                    <dt>Height</dt>
                    <dd>{d().height} m</dd>
                  </div>
                  <div>
                    <dt>Weight</dt>
                    <dd>{d().weight} kg</dd>
                  </div>
                </dl>
              </div>
            </div>
            <Show when={d().flavor}>
              <p class="flavor">{d().flavor}</p>
            </Show>

            <Section title="Base stats">
              <table class="stats-table">
                <tbody>
                  <For each={d().stats}>
                    {(s) => (
                      <tr>
                        <th scope="row">{s.label}</th>
                        <td class="stat-value">{s.value}</td>
                        <td class="stat-bar">
                          <span class="track">
                            <span class="fill" style={{ width: barWidth(s.value, 255) }} />
                          </span>
                        </td>
                      </tr>
                    )}
                  </For>
                  <tr class="total-row">
                    <th scope="row">Total</th>
                    <td class="stat-value">{d().total}</td>
                    <td class="stat-bar">
                      <span class="track">
                        <span class="fill" style={{ width: barWidth(d().total, 780) }} />
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </Section>

            <Section title="Abilities">
              <ul class="plain-list">
                <For each={d().abilities}>
                  {(a) => (
                    <li>
                      <A href={`/abilities/${a.name}`}>{a.humanized}</A>
                      {a.hidden ? " (hidden)" : ""}
                    </li>
                  )}
                </For>
              </ul>
            </Section>

            <Show when={d().evolution}>
              {(tree) => (
                <Section title="Evolution">
                  <ul class="plain-list evolution">
                    <EvoTree node={tree()} />
                  </ul>
                </Section>
              )}
            </Show>

            <MovesSection
              games={d().games}
              selectedGame={d().selectedGame}
              tables={d().tables}
            />
          </main>
        )}
      </Show>
    </Show>
  );
}
