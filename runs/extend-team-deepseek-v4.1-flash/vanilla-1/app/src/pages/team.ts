import { allTypes, get, getByName, type Pokemon, type Species, type Type } from '../api';
import { pokemonCard, section } from '../components';
import { h } from '../dom';
import { englishName, humanize } from '../format';
import type { PageContext, PageResult } from '../main';
import { MAX_TEAM_SIZE, readTeam, removeFromTeam } from '../team';

interface MemberType {
  name: string;
  label: string;
}

interface Member {
  name: string;
  id: number;
  types: MemberType[];
}

async function loadMember(name: string, typeLabels: Map<string, string>): Promise<Member | null> {
  try {
    const species = await getByName<Species>('pokemon-species', name);
    const variety = species.varieties.find((v) => v.is_default) ?? species.varieties[0];
    const pokemon = await get<Pokemon>(variety ? variety.pokemon.url : `pokemon/${species.id}`);
    const types = [...pokemon.types]
      .sort((a, b) => a.slot - b.slot)
      .map((t) => ({ name: t.type.name, label: typeLabels.get(t.type.name) ?? humanize(t.type.name) }));
    return { name: species.name, id: species.id, types };
  } catch {
    // A stored species may no longer exist in the live API; leave it out of the view.
    return null;
  }
}

function typeNames(types: Type[]): Map<string, string> {
  return new Map(types.map((t) => [t.name, englishName(t)]));
}

function coverageTable(types: Type[], members: Member[]): HTMLElement {
  const rows = types.map((type) => {
    const double = new Set(type.damage_relations.double_damage_to.map((r) => r.name));
    const half = new Set(type.damage_relations.half_damage_to.map((r) => r.name));
    const none = new Set(type.damage_relations.no_damage_to.map((r) => r.name));
    let weak = 0;
    let resistant = 0;
    for (const member of members) {
      let multiplier = 1;
      for (const defender of member.types) {
        if (double.has(defender.name)) multiplier *= 2;
        else if (half.has(defender.name)) multiplier *= 0.5;
        else if (none.has(defender.name)) multiplier *= 0;
      }
      if (multiplier > 1) weak++;
      else if (multiplier < 1) resistant++;
    }
    return h(
      'tr',
      null,
      h('th', { scope: 'row' }, englishName(type)),
      h('td', { class: 'num' }, String(weak)),
      h('td', { class: 'num' }, String(resistant)),
    );
  });

  return h(
    'table',
    { class: 'coverage' },
    h('thead', null, h('tr', null, h('th', { scope: 'col' }, 'Type'), h('th', { scope: 'col' }, 'Weak'), h('th', { scope: 'col' }, 'Resistant'))),
    h('tbody', null, rows),
  );
}

export async function renderTeam({ main }: PageContext): Promise<PageResult> {
  const types = await allTypes();
  const labels = typeNames(types);
  const names = readTeam();
  const loaded = await Promise.all(names.map((name) => loadMember(name, labels)));
  const members = loaded.filter((m): m is Member => m !== null);

  const body = h('div', { class: 'team-body' });

  const render = () => {
    const current = readTeam()
      .map((name) => members.find((m) => m.name === name))
      .filter((m): m is Member => m !== undefined);

    if (!current.length) {
      body.replaceChildren(
        h('p', { class: 'team-count' }, `${readTeam().length} of ${MAX_TEAM_SIZE}`),
        h('p', { class: 'team-empty' }, 'Your team is empty'),
        h('p', { class: 'not-found__back' }, h('a', { href: '/' }, 'Browse Pokémon')),
      );
      return;
    }

    const cards = current.map((member, index) => {
      const card = pokemonCard({ id: member.id, name: member.name, types: member.types }, index);
      card.classList.add('card-item--team');
      card.append(
        h(
          'button',
          {
            type: 'button',
            class: 'card__remove',
            onclick: () => {
              removeFromTeam(member.name);
              render();
            },
          },
          `Remove ${humanize(member.name)}`,
        ),
      );
      return card;
    });

    body.replaceChildren(
      h('p', { class: 'team-count' }, `${current.length} of ${MAX_TEAM_SIZE}`),
      h('ul', { class: 'card-grid' }, cards),
      section('Type coverage', [coverageTable(types, current)]),
    );
  };

  render();
  main.append(h('h1', null, 'Team'), body);
  return { title: 'Team', nav: 'team' };
}
