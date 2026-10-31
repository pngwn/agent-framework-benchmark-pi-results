import { Title } from "@solidjs/meta";
import { A, createAsync, useNavigate, useParams, useSearchParams } from "@solidjs/router";
import { For, onMount, Show } from "solid-js";
import { TypeBadgeLink } from "../../components/Card.jsx";
import { MoveTables } from "../../components/MoveTables.jsx";
import { NotFound } from "../../components/NotFound.jsx";
import { Section } from "../../components/Section.jsx";
import { getPokemonPage } from "../../lib/data.js";
import { dexNumber } from "../../lib/util.js";

export const route = {
  preload: ({ params, location }) =>
    getPokemonPage(params.name, new URLSearchParams(location.search).get("game") ?? ""),
};

function EvoNode(props) {
  return (
    <li>
      <A href={`/pokemon/${props.node.name}`}>{props.node.human}</A>
      <Show when={props.node.evolutions.length > 0}>
        <ul>
          <For each={props.node.evolutions}>{(node) => <EvoNode node={node} />}</For>
        </ul>
      </Show>
    </li>
  );
}

function PokemonContent(props) {
  const navigate = useNavigate();
  const d = () => props.data;

  let movesEl;
  onMount(() => {
    if (window.location.hash === "#moves" && movesEl) {
      movesEl.scrollIntoView();
    }
  });

  return (
    <main class="container">
      <Title>{`${d().en} – Pokédex`}</Title>
      <div class="panel pokemon-hero">
        <div class="hero-artwork">
          <img src={d().artwork} alt={d().en} width="288" height="288" />
        </div>
        <div class="hero-info">
          <p class="hero-dex">{dexNumber(d().id)}</p>
          <h1>{d().en}</h1>
          <p class="hero-genus">{d().genus}</p>
          <p class="hero-types">
            <For each={d().types}>{(t) => <TypeBadgeLink type={t} />}</For>
          </p>
          <dl class="hero-measures">
            <div>
              <dt>Height</dt>
              <dd>{d().height} m</dd>
            </div>
            <div>
              <dt>Weight</dt>
              <dd>{d().weight} kg</dd>
            </div>
          </dl>
          <p class="hero-flavor">{d().flavor}</p>
        </div>
      </div>

      <Section title="Base stats">
        <table class="stats-table">
          <tbody>
            <For each={d().stats}>
              {(s) => (
                <tr>
                  <th scope="row">{s.label}</th>
                  <td class="stat-value">{s.value}</td>
                  <td class="stat-bar-cell">
                    <span class="stat-track">
                      <span class="stat-fill" style={{ width: `${Math.min(100, (s.value / 255) * 100)}%` }} />
                    </span>
                  </td>
                </tr>
              )}
            </For>
            <tr class="stat-total">
              <th scope="row">Total</th>
              <td class="stat-value">{d().total}</td>
              <td class="stat-bar-cell">
                <span class="stat-track">
                  <span class="stat-fill" style={{ width: `${Math.min(100, (d().total / (255 * 6)) * 100)}%` }} />
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </Section>

      <Section title="Abilities">
        <ul class="ability-list">
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

      <Section title="Evolution">
        <ul class="evo-tree">
          <EvoNode node={d().evolution} />
        </ul>
      </Section>

      <section id="moves" aria-labelledby="moves-heading" class="panel" ref={movesEl}>
        <h2 id="moves-heading">Moves</h2>
        <Show when={d().games.length > 0}>
          <div class="field game-field">
            <label for="game-select">Game</label>
            <select
              id="game-select"
              onChange={(e) => navigate(`/pokemon/${d().speciesName}?game=${e.currentTarget.value}#moves`)}
            >
              <For each={d().games}>{(g) => <option value={g.name} selected={g.name === d().selectedGame}>{g.human}</option>}</For>
            </select>
          </div>
        </Show>
        <MoveTables methods={d().methods} />
      </section>
    </main>
  );
}

export default function PokemonPage() {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const data = createAsync(() => getPokemonPage(params.name, searchParams.game ?? ""));

  return (
    <>
      <Show when={data() === null}>
        <NotFound />
      </Show>
      <Show when={data()}>{(d) => <PokemonContent data={d()} />}</Show>
    </>
  );
}
