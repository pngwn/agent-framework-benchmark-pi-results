import { apiJson, isNotFound } from '../api';
import { getTypeNameMap, getTypeRecords, speciesFromPokemonRefs } from '../data';
import { cardList, pokemonCard, section, typeBadge } from '../components';
import { enName, esc, humanize } from '../util';
import { renderNotFound } from './notFound';

export async function renderTypeList(root: HTMLElement): Promise<void> {
  const types = await getTypeRecords();
  document.title = 'Types – Pokédex';
  root.innerHTML =
    `<h1>Types</h1>` +
    `<ul class="type-grid">${types
      .map((t) => `<li><a class="type-tile type-${esc(t.name)}" href="/types/${esc(t.name)}">${esc(enName(t))}</a></li>`)
      .join('')}</ul>`;
}

const RELATIONS: [string, string][] = [
  ['Super effective against', 'double_damage_to'],
  ['Not very effective against', 'half_damage_to'],
  ['No effect against', 'no_damage_to'],
  ['Weak to', 'double_damage_from'],
  ['Resists', 'half_damage_from'],
  ['Immune to', 'no_damage_from'],
];

export async function renderType(root: HTMLElement, name: string): Promise<void> {
  let type: any;
  try {
    type = await apiJson(`/type/${encodeURIComponent(name)}`);
  } catch (e) {
    if (isNotFound(e)) return renderNotFound(root);
    throw e;
  }

  const [typeNames, species] = await Promise.all([
    getTypeNameMap(),
    speciesFromPokemonRefs(type.pokemon ?? []),
  ]);

  const title = enName(type);
  document.title = `${title} – Pokédex`;

  const relations = RELATIONS.map(([label, key]) => {
    const related: any[] = type.damage_relations?.[key] ?? [];
    const content = related.length
      ? related.map((r) => typeBadge({ name: r.name, en: typeNames.get(r.name) ?? humanize(r.name) }, true)).join('')
      : 'None';
    return `<div class="relation"><dt>${esc(label)}</dt><dd>${content}</dd></div>`;
  }).join('');

  const moves = [...(type.moves ?? [])]
    .map((m) => ({ api: m.name as string, label: humanize(m.name as string) }))
    .sort((a, b) => a.label.localeCompare(b.label, 'en'));

  root.innerHTML =
    `<h1>${esc(title)}</h1>` +
    section('Damage relations', `<dl class="relations">${relations}</dl>`) +
    section(
      'Pokémon',
      `<p class="count">${species.length} Pokémon</p>` +
        (species.length ? cardList(species.map((sp) => pokemonCard(sp))) : ''),
    ) +
    section(
      'Moves',
      `<p class="count">${moves.length} moves</p>` +
        `<ul class="move-list">${moves
          .map((m) => `<li><a href="/moves/${esc(m.api)}">${esc(m.label)}</a></li>`)
          .join('')}</ul>`,
    );
}
