import { Title } from "@solidjs/meta";
import { A, createAsync, useParams, useSearchParams } from "@solidjs/router";
import { createMemo, For, Show } from "solid-js";
import { MovesSection } from "~/components/MovesSection";
import { NotFound } from "~/components/NotFound";
import { Section } from "~/components/Section";
import { TypeBadgeLink } from "~/components/TypeBadge";
import { getPokemonDetail, getPokemonMoves } from "~/lib/api";

const first = (v: string | string[] | undefined): string => (Array.isArray(v) ? v[0] : v) ?? "";

function EvoNode(props: { node: any }) {
  return (
    <li>
      <A href={`/pokemon/${props.node.name}`}>{props.node.human}</A>
      <Show when={props.node.children?.length}>
        <ul>
          <For each={props.node.children}>{(child: any) => <EvoNode node={child} />}</For>
        </ul>
      </Show>
    </li>
  );
}

const statPct = (v: number, max: number) => `${Math.min(100, Math.max(2, Math.round((v / max) * 100)))}%`;

export default function PokemonPage() {
  const params = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const detail = createAsync(() => getPokemonDetail(params.name));

  const selectedGame = createMemo(() => {
    const d = detail();
    if (!d || d.games.length === 0) return "";
    const g = first(searchParams.game);
    return g && d.games.some((x) => x.name === g) ? g : d.games[d.games.length - 1].name;
  });

  const moves = createAsync(() => {
    const g = selectedGame();
    return g ? getPokemonMoves(params.name, g) : null;
  });

  return (
    <Show when={detail() !== undefined} fallback={<p class="loading">Loading…</p>}>
      <Show when={detail()} fallback={<NotFound />}>
        {(d) => (
          <>
            <Title>{`${d().enName} – Pokédex`}</Title>
            <div class="pokemon-summary">
              <div class="artwork-card">
                <Show when={d().artwork}>
                  {(src) => <img src={src()} alt={d().enName} width="288" height="288" />}
                </Show>
              </div>
              <div class="summary-info">
                <p class="dex">{d().dex}</p>
                <h1>{d().enName}</h1>
                <p class="genus">{d().genus}</p>
                <p class="summary-types">
                  <For each={d().types}>{(t) => <TypeBadgeLink type={t} />}</For>
                </p>
                <dl class="facts">
                  <div>
                    <dt>Height</dt>
                    <dd>{d().height}</dd>
                  </div>
                  <div>
                    <dt>Weight</dt>
                    <dd>{d().weight}</dd>
                  </div>
                </dl>
              </div>
              <p class="flavor">{d().flavor}</p>
            </div>

            <Section title="Base stats" headingId="stats-heading">
              <table class="stats-table">
                <tbody>
                  <For each={d().stats}>
                    {(s) => (
                      <tr>
                        <th scope="row">{s.label}</th>
                        <td class="stat-value">{s.value}</td>
                        <td class="stat-bar-cell">
                          <div class="stat-track">
                            <div class="stat-bar" style={{ width: statPct(s.value, 255) }} />
                          </div>
                        </td>
                      </tr>
                    )}
                  </For>
                  <tr class="stat-total">
                    <th scope="row">Total</th>
                    <td class="stat-value">{d().total}</td>
                    <td class="stat-bar-cell">
                      <div class="stat-track">
                        <div class="stat-bar" style={{ width: statPct(d().total, 720) }} />
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </Section>

            <Section title="Abilities" headingId="abilities-heading">
              <ul class="link-list">
                <For each={d().abilities}>
                  {(a) => (
                    <li>
                      <A href={`/abilities/${a.name}`}>{a.human}</A>
                      {a.hidden ? " (hidden)" : ""}
                    </li>
                  )}
                </For>
              </ul>
            </Section>

            <Section title="Evolution" headingId="evolution-heading">
              <ul class="evo-tree">
                <EvoNode node={d().evolution} />
              </ul>
            </Section>

            <MovesSection
              games={d().games}
              selectedGame={selectedGame()}
              moves={moves()}
              onGameChange={(game) => setSearchParams({ game }, { scroll: false })}
            />
          </>
        )}
      </Show>
    </Show>
  );
}
