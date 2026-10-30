import { component$ } from '@builder.io/qwik';
import {
  routeLoader$,
  useLocation,
  useNavigate,
  type DocumentHead,
} from '@builder.io/qwik-city';
import { getPokemonPage } from '~/lib/api';
import { dexNumber, humanize } from '~/lib/format';
import { NotFound } from '~/components/ui';
import { MoveTable } from '~/components/MoveTables';

export const usePokemonPage = routeLoader$(async ({ params, status, url }) => {
  const data = await getPokemonPage(params.name, url.searchParams.get('game'));
  if (!data) {
    status(404);
    return { notFound: true as const };
  }
  return data;
});

const EvolutionNode = component$((props: { node: { name: string; children: any[] } }) => {
  return (
    <li>
      <a href={`/pokemon/${props.node.name}`}>{humanize(props.node.name)}</a>
      {props.node.children.length > 0 && (
        <ul>
          {props.node.children.map((child) => (
            <EvolutionNode key={child.name} node={child} />
          ))}
        </ul>
      )}
    </li>
  );
});

export default component$(() => {
  const data = usePokemonPage();
  const location = useLocation();
  const navigate = useNavigate();

  if (data.value.notFound) return <NotFound />;

  const pokemon = data.value;

  return (
    <>
      <div class="pokemon-summary">
        <div class="artwork">
          <img src={pokemon.artwork} alt={pokemon.englishName} width={288} height={288} />
        </div>
        <div class="summary-info">
          <p class="dex-number">{dexNumber(pokemon.id)}</p>
          <h1>{pokemon.englishName}</h1>
          <p class="genus">{pokemon.genus}</p>
          <div class="type-row">
            {pokemon.types.map((type: any) => (
              <a class={`type-badge type-${type.name}`} href={`/types/${type.name}`} key={type.name}>{type.label}</a>
            ))}
          </div>
          <dl class="measurements">
            <div><dt>Height</dt><dd>{pokemon.height.toFixed(1)} m</dd></div>
            <div><dt>Weight</dt><dd>{pokemon.weight.toFixed(1)} kg</dd></div>
          </dl>
          <p class="flavor-text">{pokemon.flavor}</p>
        </div>
      </div>

      <section class="panel" aria-labelledby="stats-heading">
        <h2 id="stats-heading">Base stats</h2>
        <table class="stats-table">
          <tbody>
            {pokemon.stats.map((stat: any) => (
              <tr key={stat.name}>
                <th scope="row">{stat.label}</th>
                <td class="stat-value">{stat.value}</td>
                <td class="stat-bar-cell">
                  <span class="stat-track">
                    <span class="stat-bar" style={{ width: `${Math.min(100, (stat.value / 255) * 100)}%` }}></span>
                  </span>
                </td>
              </tr>
            ))}
            <tr>
              <th scope="row">Total</th>
              <td class="stat-value">{pokemon.total}</td>
              <td class="stat-bar-cell"></td>
            </tr>
          </tbody>
        </table>
      </section>

      <section class="panel" aria-labelledby="abilities-heading">
        <h2 id="abilities-heading">Abilities</h2>
        <ul class="abilities-list">
          {pokemon.abilities.map((ability) => (
            <li key={ability.name}>
              <a href={`/abilities/${ability.name}`}>{ability.label}</a>
              {ability.hidden && ' (hidden)'}
            </li>
          ))}
        </ul>
      </section>

      <section class="panel" aria-labelledby="evolution-heading">
        <h2 id="evolution-heading">Evolution</h2>
        {pokemon.evolution ? (
          <ul class="evolution-list">
            <EvolutionNode node={pokemon.evolution} />
          </ul>
        ) : (
          <p>—</p>
        )}
      </section>

      <section class="panel moves-section" id="moves" aria-labelledby="moves-heading">
        <h2 id="moves-heading">Moves</h2>
        <div class="game-control">
          <label for="pokemon-game">Game</label>
          <select
            id="pokemon-game"
            value={pokemon.selectedGame ?? ''}
            onChange$={(event) => {
              const value = (event.target as HTMLSelectElement).value;
              const url = new URL(location.url.href);
              url.searchParams.set('game', value);
              navigate(url.pathname + url.search + url.hash);
            }}
          >
            {pokemon.games.map((game) => (
              <option key={game.name} value={game.name} selected={pokemon.selectedGame === game.name}>{game.label}</option>
            ))}
          </select>
        </div>
        {pokemon.tables.map((table) => (
          <MoveTable key={table.method} table={table} />
        ))}
      </section>
    </>
  );
});

export const head: DocumentHead = ({ resolveValue }) => {
  const data = resolveValue(usePokemonPage);
  return { title: data.notFound ? 'Not found – Pokédex' : `${data.englishName} – Pokédex` };
};
