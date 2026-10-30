import { allTypes, getByName, type RelationKey, type Type } from '../api';
import { cardList, cardsFromPokemon, countLine, section, typeBadge } from '../components';
import { h } from '../dom';
import { englishName, humanize } from '../format';
import type { PageContext, PageResult } from '../main';

export async function renderTypes({ main }: PageContext): Promise<PageResult> {
  const types = await allTypes();
  main.append(
    h('h1', null, 'Types'),
    h('ul', { class: 'type-grid' }, types.map((t) => h('li', null, typeBadge(t.name, englishName(t))))),
  );
  return { title: 'Types', nav: 'types' };
}

const RELATIONS: [RelationKey, string][] = [
  ['double_damage_to', 'Super effective against'],
  ['half_damage_to', 'Not very effective against'],
  ['no_damage_to', 'No effect against'],
  ['double_damage_from', 'Weak to'],
  ['half_damage_from', 'Resists'],
  ['no_damage_from', 'Immune to'],
];

export async function renderType({ main }: PageContext, name: string): Promise<PageResult> {
  const type = await getByName<Type>('type', name);
  const [types, cards] = await Promise.all([allTypes(), cardsFromPokemon(type.pokemon, (p) => p.pokemon)]);
  const labels = new Map(types.map((t) => [t.name, englishName(t)]));
  const label = (n: string) => labels.get(n) ?? humanize(n);
  const title = englishName(type);
  const moves = type.moves.map((m) => ({ name: m.name, label: humanize(m.name) })).sort((a, b) => a.label.localeCompare(b.label));

  main.append(
    h('h1', null, title),
    section('Damage relations', [
      h(
        'dl',
        { class: 'relations' },
        RELATIONS.map(([key, term]) => {
          const related = type.damage_relations[key] ?? [];
          return h(
            'div',
            null,
            h('dt', null, term),
            h(
              'dd',
              null,
              related.length ? h('ul', { class: 'type-list' }, related.map((r) => h('li', null, typeBadge(r.name, label(r.name))))) : 'None',
            ),
          );
        }),
      ),
    ]),
    section('Pokémon', [countLine(cards.length), cards.length ? cardList(cards) : null]),
    section('Moves', [
      countLine(moves.length, 'moves'),
      moves.length ? h('ul', { class: 'move-columns' }, moves.map((m) => h('li', null, h('a', { href: `/moves/${m.name}` }, m.label)))) : null,
    ]),
  );
  return { title, nav: 'types' };
}
