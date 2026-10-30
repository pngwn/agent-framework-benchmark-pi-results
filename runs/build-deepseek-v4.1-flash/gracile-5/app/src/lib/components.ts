import { html } from '@gracile/gracile/server-html';

import { dexNumber, displayValue, humanize, typeLabel } from './format.js';
import type { EvolutionNode } from './data.js';

export type PokemonCardData = {
  id: number;
  name: string;
  sprite: string | null;
  types?: string[];
};

export type TypeSummary = { name: string; label: string };

export const typePill = (name: string, label = typeLabel(name), href?: string) => {
  const className = `type-pill type-${name}`;
  return href
    ? html`<a class=${className} href=${href}>${label}</a>`
    : html`<span class=${className}>${label}</span>`;
};

export const pokemonCard = (pokemon: PokemonCardData & { hidden?: boolean }, options: { types?: boolean } = {}) => html`
  <li class="card-item">
    <a class="pokemon-card" href=${`/pokemon/${pokemon.name}`}>
      ${pokemon.sprite
        ? html`<img class="card-sprite" src=${pokemon.sprite} alt="" width="96" height="96" loading="lazy" />`
        : html`<span class="card-sprite card-sprite--empty" aria-hidden="true"></span>`}
      <span class="card-dex">${dexNumber(pokemon.id)}</span>
      <span class="card-name">${humanize(pokemon.name)}</span>
      ${options.types && pokemon.types?.length
        ? html`<span class="card-types">${pokemon.types.map((type) => typePill(type))}</span>`
        : ''}
      ${pokemon.hidden ? html`<span class="card-hidden">Hidden ability</span>` : ''}
    </a>
  </li>
`;

export const pokemonGrid = (
  pokemons: (PokemonCardData & { hidden?: boolean })[],
  options: { types?: boolean } = {},
) => html`<ul class="pokemon-grid">${pokemons.map((pokemon) => pokemonCard(pokemon, options))}</ul>`;

export const notFound = () => html`
  <main class="page">
    <h1>Not found</h1>
    <p><a href="/">Back to the Pokédex</a></p>
  </main>
`;

export const sectionHeading = (id: string, label: string) =>
  html`<h2 id=${id}>${label}</h2>`;

export const evolutionList = (nodes: EvolutionNode[]) => html`
  <ul class="evolution-list">
    ${nodes.map(
      (node) => html`
        <li>
          <a href=${`/pokemon/${node.name}`}>${node.label}</a>
          ${node.children.length ? evolutionNested(node.children) : ''}
        </li>
      `,
    )}
  </ul>
`;

const evolutionNested = (nodes: EvolutionNode[]) => html`
  <ul class="evolution-list evolution-list--nested">
    ${nodes.map(
      (node) => html`
        <li>
          <span class="evolution-arrow" aria-hidden="true">↳</span>
          <a href=${`/pokemon/${node.name}`}>${node.label}</a>
          ${node.children.length ? evolutionNested(node.children) : ''}
        </li>
      `,
    )}
  </ul>
`;

export const moveTable = (table: any) => html`
  <table class="move-table" data-sortable aria-label=${table.label}>
    <caption>${table.label}</caption>
    <thead>
      <tr>
        ${table.hasLevel
          ? html`<th scope="col"><button type="button" data-sort-type="number">Level</button></th>`
          : ''}
        <th scope="col"><button type="button" data-sort-type="text">Move</button></th>
        <th scope="col"><button type="button" data-sort-type="text">Type</button></th>
        <th scope="col"><button type="button" data-sort-type="text">Category</button></th>
        <th scope="col"><button type="button" data-sort-type="number">Power</button></th>
        <th scope="col"><button type="button" data-sort-type="number">Accuracy</button></th>
        <th scope="col"><button type="button" data-sort-type="number">PP</button></th>
      </tr>
    </thead>
    <tbody>
      ${table.rows.map(
        (row: any) => html`
          <tr>
            ${table.hasLevel
              ? html`<th scope="row" data-sort-value=${String(row.level)}>${row.level}</th>`
              : ''}
            <td data-sort-value=${row.moveLabel.toLowerCase()}>
              <a href=${`/moves/${row.moveName}`}>${row.moveLabel}</a>
            </td>
            <td data-sort-value=${row.typeLabel.toLowerCase()}>
              ${typePill(row.typeName, row.typeLabel, `/types/${row.typeName}`)}
            </td>
            <td data-sort-value=${row.category.toLowerCase()}>${row.category}</td>
            <td data-sort-value=${row.power === null || row.power === undefined ? '' : String(row.power)}>${displayValue(row.power)}</td>
            <td data-sort-value=${row.accuracy === null || row.accuracy === undefined ? '' : String(row.accuracy)}>${displayValue(row.accuracy)}</td>
            <td data-sort-value=${row.pp === null || row.pp === undefined ? '' : String(row.pp)}>${displayValue(row.pp)}</td>
          </tr>
        `,
      )}
    </tbody>
  </table>
`;

export const statTable = (stats: any[], total: number) => html`
  <table class="stats-table">
    <tbody>
      ${stats.map(
        (stat) => html`
          <tr>
            <th scope="row">${stat.label}</th>
            <td>
              <span class="stat-value">${stat.value}</span>
              <span class="stat-bar" aria-hidden="true"><span class="stat-fill" style=${`width:${Math.min(100, (stat.value / 255) * 100)}%`}></span></span>
            </td>
          </tr>
        `,
      )}
      <tr>
        <th scope="row">Total</th>
        <td>
          <span class="stat-value">${total}</span>
          <span class="stat-bar" aria-hidden="true"><span class="stat-fill" style=${`width:${Math.min(100, (total / 1530) * 100)}%`}></span></span>
        </td>
      </tr>
    </tbody>
  </table>
`;
