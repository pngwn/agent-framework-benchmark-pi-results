import { html } from 'hono/html';
import { humanize, dexNumber, orMissing } from '../format.js';
import { section, typeBadge } from './components.js';

const MAX_STAT = 255;
const MAX_TOTAL = 720;

const summaryHtml = ({ species, pokemon, name, genus, types, artwork, flavor }) => html`
  <div class="summary">
    <div class="artwork-box">
      ${artwork ? html`<img src="${artwork}" alt="${name}" width="288" height="288">` : ''}
    </div>
    <div class="summary-info">
      <p class="dex">${dexNumber(species.id)}</p>
      <h1>${name}</h1>
      ${genus ? html`<p class="genus">${genus}</p>` : ''}
      <p class="badges">${types.map((t) => typeBadge(t, true))}</p>
      <dl class="facts">
        <div>
          <dt>Height</dt>
          <dd>${(pokemon.height / 10).toFixed(1)} m</dd>
        </div>
        <div>
          <dt>Weight</dt>
          <dd>${(pokemon.weight / 10).toFixed(1)} kg</dd>
        </div>
      </dl>
      ${flavor ? html`<p class="flavor">${flavor}</p>` : ''}
    </div>
  </div>`;

const statsHtml = (stats) => {
  const total = stats.reduce((sum, s) => sum + s.value, 0);
  const bar = (value, max) =>
    html`<span class="bar-track"><span class="bar-fill" style="width: ${Math.min(100, (value / max) * 100)}%"></span></span>`;
  return html`
    <table class="stats">
      <tbody>
        ${stats.map(
          (s) => html`<tr>
            <th scope="row">${s.label}</th>
            <td class="stat-num">${s.value}</td>
            <td class="stat-bar">${bar(s.value, MAX_STAT)}</td>
          </tr>`,
        )}
        <tr class="total">
          <th scope="row">Total</th>
          <td class="stat-num">${total}</td>
          <td class="stat-bar">${bar(total, MAX_TOTAL)}</td>
        </tr>
      </tbody>
    </table>`;
};

const abilitiesHtml = (abilities) => html`
  <ul class="plain-list">
    ${abilities.map(
      (a) => html`<li>
        <a href="/abilities/${a.name}">${humanize(a.name)}</a>${a.hidden ? html` <span class="muted">(hidden)</span>` : ''}
      </li>`,
    )}
  </ul>`;

const evolutionHtml = (chain) => {
  const node = (n) => html`
    <li>
      <a href="/pokemon/${n.species.name}">${humanize(n.species.name)}</a>
      ${n.evolves_to?.length ? html`<ul>${n.evolves_to.map(node)}</ul>` : ''}
    </li>`;
  return html`<ul class="plain-list">${node(chain)}</ul>`;
};

const sortableTh = (label, numeric = false) =>
  html`<th scope="col"${numeric ? html` data-type="number"` : ''}><button type="button" class="sort">${label}</button></th>`;

// The Moves section; also the htmx fragment returned when the game changes.
export const movesSection = ({ speciesName, games, selectedGame, methods }) => html`
  <section id="moves" aria-labelledby="moves-heading">
    <h2 id="moves-heading">Moves</h2>
    <form
      class="game-form"
      action="/pokemon/${speciesName}"
      method="get"
      hx-get="/pokemon/${speciesName}"
      hx-target="#moves"
      hx-swap="outerHTML"
      hx-push-url="true"
      hx-trigger="change from:select"
    >
      <div class="game-field">
        <label for="game">Game</label>
        <select id="game" name="game">
          ${games.map((g) => html`<option value="${g}"${g === selectedGame ? html` selected` : ''}>${humanize(g)}</option>`)}
        </select>
      </div>
    </form>
    ${methods.map(
      (m) => html`
        <table class="moves">
          <caption>${m.label}</caption>
          <thead>
            <tr>
              ${m.name === 'level-up' ? sortableTh('Level', true) : ''}
              ${sortableTh('Move')} ${sortableTh('Type')} ${sortableTh('Category')} ${sortableTh('Power', true)}
              ${sortableTh('Accuracy', true)} ${sortableTh('PP', true)}
            </tr>
          </thead>
          <tbody>
            ${m.rows.map(
              (r) => html`<tr>
                ${m.name === 'level-up' ? html`<td>${r.level}</td>` : ''}
                <td><a href="/moves/${r.move}">${r.moveName}</a></td>
                <td>${typeBadge({ name: r.type, label: r.typeName }, true)}</td>
                <td>${r.category}</td>
                <td>${orMissing(r.power)}</td>
                <td>${orMissing(r.accuracy)}</td>
                <td>${orMissing(r.pp)}</td>
              </tr>`,
            )}
          </tbody>
        </table>`,
    )}
  </section>`;

export const pokemonPage = (data) => html`
  ${summaryHtml(data)}
  ${section('base-stats', 'Base stats', statsHtml(data.stats))}
  ${section('abilities', 'Abilities', abilitiesHtml(data.abilities))}
  ${section('evolution', 'Evolution', evolutionHtml(data.chain))}
  ${movesSection(data)}
`;
