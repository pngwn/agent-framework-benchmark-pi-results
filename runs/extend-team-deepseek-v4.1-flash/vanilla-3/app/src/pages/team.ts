import { allTypes, get, getByName, type Pokemon, type Species, type Type } from '../api';
import { pokemonCardLink, section, type CardData } from '../components';
import { h } from '../dom';
import { englishName, humanize } from '../format';
import type { PageContext, PageResult } from '../main';
import { getTeam, removeFromTeam, TEAM_SIZE } from '../team';

interface Member {
  species: Species;
  pokemon: Pokemon;
  card: CardData;
}

async function loadMember(name: string): Promise<{ species: Species; pokemon: Pokemon }> {
  const species = await getByName<Species>('pokemon-species', name);
  const variety = species.varieties.find((v) => v.is_default) ?? species.varieties[0];
  const pokemon = await get<Pokemon>(variety ? variety.pokemon.url : `pokemon/${species.id}`);
  return { species, pokemon };
}

function makeMember(species: Species, pokemon: Pokemon, typeLabels: Map<string, string>): Member {
  const types = [...pokemon.types]
    .sort((a, b) => a.slot - b.slot)
    .map((t) => ({ name: t.type.name, label: typeLabels.get(t.type.name) ?? humanize(t.type.name) }));
  return { species, pokemon, card: { id: species.id, name: species.name, types } };
}

function multiplier(attacking: Type, defending: string): number {
  const relations = attacking.damage_relations;
  if (relations.no_damage_to.some((t) => t.name === defending)) return 0;
  if (relations.half_damage_to.some((t) => t.name === defending)) return 0.5;
  if (relations.double_damage_to.some((t) => t.name === defending)) return 2;
  return 1;
}

function coverageSection(types: Type[], members: Member[]): HTMLElement {
  const rows = types.map((attacking) => {
    let weak = 0;
    let resistant = 0;
    for (const member of members) {
      const damage = member.pokemon.types.reduce((product, t) => product * multiplier(attacking, t.type.name), 1);
      if (damage > 1) weak++;
      else if (damage < 1) resistant++;
    }
    return h(
      'tr',
      null,
      h('th', { scope: 'row' }, englishName(attacking)),
      h('td', null, String(weak)),
      h('td', null, String(resistant)),
    );
  });

  return section('Type coverage', [
    h(
      'table',
      { class: 'coverage-table' },
      h(
        'thead',
        null,
        h('tr', null, h('th', { scope: 'col' }, 'Type'), h('th', { scope: 'col' }, 'Weak'), h('th', { scope: 'col' }, 'Resistant')),
      ),
      h('tbody', null, rows),
    ),
  ]);
}

export async function renderTeam({ main }: PageContext): Promise<PageResult> {
  const names = getTeam();
  const [types, loaded] = await Promise.all([allTypes(), Promise.all(names.map(loadMember))]);
  const typeLabels = new Map(types.map((t) => [t.name, englishName(t)]));
  let members = loaded.map(({ species, pokemon }) => makeMember(species, pokemon, typeLabels));

  const content = h('div', { class: 'team-content' });

  const render = () => {
    const count = h('p', { class: 'count team-count' }, `${members.length} of ${TEAM_SIZE}`);
    if (!members.length) {
      content.replaceChildren(
        count,
        h('p', { class: 'team-empty' }, 'Your team is empty'),
        h('p', null, h('a', { href: '/' }, 'Browse Pokémon')),
      );
      return;
    }

    const list = h(
      'ul',
      { class: 'card-grid team-grid' },
      members.map((member, index) =>
        h(
          'li',
          { class: 'card-item team-card-item' },
          pokemonCardLink(member.card, index),
          h(
            'button',
            {
              type: 'button',
              class: 'team-remove',
              onclick: () => {
                removeFromTeam(member.species.name);
                members = members.filter((m) => m !== member);
                render();
              },
            },
            `Remove ${humanize(member.species.name)}`,
          ),
        ),
      ),
    );

    content.replaceChildren(count, list, coverageSection(types, members));
  };

  render();
  main.append(h('h1', null, 'Team'), content);
  return { title: 'Team', nav: 'team' };
}
