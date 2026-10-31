import { Title } from "@solidjs/meta";
import { A, createAsync, useParams, useSearchParams } from "@solidjs/router";
import { For, Match, Show, Switch } from "solid-js";
import MovesTable from "~/components/MovesTable";
import NotFound from "~/components/NotFound";
import Section from "~/components/Section";
import { dexNumber, humanize } from "~/lib/format";
import { getPokemonPage } from "~/lib/queries";

function EvoNode(props: { node: { name: string; children: any[] } }) {
  return (
    <li>
      <A href={`/pokemon/${props.node.name}`}>{humanize(props.node.name)}</A>
      <Show when={props.node.children.length > 0}>
        <ul>
          <For each={props.node.children}>{(c) => <EvoNode node={c} />}</For>
        </ul>
      </Show>
    </li>
  );
}

export default function PokemonPage() {
  const params = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const data = createAsync(() =>
    getPokemonPage(params.name, searchParams.game as string | undefined),
  );

  return (
    <Switch>
      <Match when={data() === null}>
        <NotFound />
      </Match>
      <Match when={data()}>
        {(d) => (
          <main class="container">
            <Title>{d().en} – Pokédex</Title>
            <div class="summary">
              <div class="summary-artwork">
                <Show when={d().artwork}>
                  {(src) => <img src={src()} alt={d().en} width="288" height="288" />}
                </Show>
              </div>
              <div class="summary-info">
                <p class="dex">{dexNumber(d().id)}</p>
                <h1>{d().en}</h1>
                <p class="genus">{d().genus}</p>
                <p class="summary-types">
                  <For each={d().types}>
                    {(t) => (
                      <A class={`type-badge type-${t.name}`} href={`/types/${t.name}`}>
                        {t.en}
                      </A>
                    )}
                  </For>
                </p>
                <dl class="facts">
                  <div>
                    <dt>Height</dt>
                    <dd>{(d().height / 10).toFixed(1)} m</dd>
                  </div>
                  <div>
                    <dt>Weight</dt>
                    <dd>{(d().weight / 10).toFixed(1)} kg</dd>
                  </div>
                </dl>
                <p class="flavor">{d().flavor}</p>
              </div>
            </div>

            <Section title="Base stats">
              <table class="stats-table">
                <tbody>
                  <For each={d().stats}>
                    {(s) => (
                      <tr>
                        <th scope="row">{s.label}</th>
                        <td class="num">{s.value}</td>
                        <td class="bar">
                          <span class="stat-bar">
                            <span style={{ width: `${Math.min(100, (s.value / 255) * 100)}%` }} />
                          </span>
                        </td>
                      </tr>
                    )}
                  </For>
                  <tr class="total">
                    <th scope="row">Total</th>
                    <td class="num">{d().total}</td>
                    <td class="bar">
                      <span class="stat-bar">
                        <span style={{ width: `${Math.min(100, (d().total / 765) * 100)}%` }} />
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </Section>

            <Section title="Abilities">
              <ul class="link-list">
                <For each={d().abilities}>
                  {(a) => (
                    <li>
                      <A href={`/abilities/${a.name}`}>{humanize(a.name)}</A>
                      {a.hidden && <span class="muted"> (hidden)</span>}
                    </li>
                  )}
                </For>
              </ul>
            </Section>

            <Section title="Evolution">
              <ul class="evo-tree">
                <EvoNode node={d().evolution} />
              </ul>
            </Section>

            <Section title="Moves" id="moves">
              <div class="game-picker">
                <label for="game-select">Game</label>
                <select
                  id="game-select"
                  onChange={(e) => setSearchParams({ game: e.currentTarget.value || undefined })}
                >
                  <For each={d().games}>
                    {(g) => (
                      <option value={g.name} selected={d().selectedGame === g.name}>
                        {g.en}
                      </option>
                    )}
                  </For>
                </select>
              </div>
              <div class="moves-scroll">
                <For each={d().tables}>{(t) => <MovesTable table={t} />}</For>
              </div>
            </Section>
          </main>
        )}
      </Match>
    </Switch>
  );
}
