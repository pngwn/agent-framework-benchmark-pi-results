import { allTypes, get, getByName, NotFoundError, type Pokemon, type Species, type Type } from '../api';
import { pokemonCard, section, type CardData } from '../components';
import { fragment, h, type Child } from '../dom';
import { englishName, humanize } from '../format';
import type { PageContext, PageResult } from '../main';
import { getTeam, removeFromTeam, subscribeToTeam, TEAM_SIZE } from '../team';

interface TeamMember extends CardData {
  /** Type API names, in slot order. */
  typeNames: string[];
}

async function loadMember(name: string, labels: Map<string, string>): Promise<TeamMember | null> {
  try {
    const species = await getByName<Species>('pokemon-species', name);
    const variety = species.varieties.find((v) => v.is_default) ?? species.varieties[0];
    const pokemon = await get<Pokemon>(variety ? variety.pokemon.url : `pokemon/${species.id}`);
    const typeNames = [...pokemon.types].sort((a, b) => a.slot - b.slot).map((t) => t.type.name);
    return {
      id: species.id,
      name: species.name,
      typeNames,
      types: typeNames.map((n) => ({ name: n, label: labels.get(n) ?? humanize(n) })),
    };
  } catch (err) {
    // A species that has disappeared from the API can't be shown; leave it out of the page.
    if (err instanceof NotFoundError) return null;
    throw err;
  }
}

function memberCard(member: TeamMember, index: number, onRemove: () => void): HTMLLIElement {
  const item = pokemonCard(member, index);
  item.classList.add('team-card-item');
  item.append(
    h(
      'button',
      { type: 'button', class: 'team-card-button', onclick: onRemove },
      `Remove ${humanize(member.name)}`,
    ),
  );
  return item;
}

function damageMultiplier(attacking: Type, defending: string): number {
  const relations = attacking.damage_relations;
  if (relations.double_damage_to.some((t) => t.name === defending)) return 2;
  if (relations.half_damage_to.some((t) => t.name === defending)) return 0.5;
  if (relations.no_damage_to.some((t) => t.name === defending)) return 0;
  return 1;
}

function coverageTable(types: Type[], members: TeamMember[]): HTMLElement {
  return h(
    'table',
    { class: 'coverage-table' },
    h(
      'thead',
      null,
      h('tr', null, h('th', { scope: 'col' }, 'Type'), h('th', { scope: 'col' }, 'Weak'), h('th', { scope: 'col' }, 'Resistant')),
    ),
    h(
      'tbody',
      null,
      types.map((type) => {
        let weak = 0;
        let resistant = 0;
        for (const member of members) {
          const multiplier = member.typeNames.reduce((product, defending) => product * damageMultiplier(type, defending), 1);
          if (multiplier > 1) weak += 1;
          else if (multiplier < 1) resistant += 1;
        }
        return h(
          'tr',
          null,
          h('th', { scope: 'row' }, englishName(type)),
          h('td', { class: 'num' }, weak),
          h('td', { class: 'num' }, resistant),
        );
      }),
    ),
  );
}

function teamContent(names: readonly string[], members: TeamMember[], types: Type[], onRemove: (name: string) => void): Child[] {
  const content: Child[] = [
    h('h1', null, 'Team'),
    h('p', { class: 'count team-count' }, `${names.length} of ${TEAM_SIZE}`),
  ];
  if (!names.length) {
    content.push(h('p', { class: 'team-empty' }, 'Your team is empty'), h('p', null, h('a', { href: '/' }, 'Browse the Pokédex')));
    return content;
  }
  content.push(
    h(
      'ul',
      { class: 'card-grid team-list' },
      members.map((member, i) => memberCard(member, i, () => onRemove(member.name))),
    ),
    section('Type coverage', [coverageTable(types, members)]),
  );
  return content;
}

export async function renderTeam(ctx: PageContext): Promise<PageResult> {
  const types = await allTypes();
  const labels = new Map(types.map((t) => [t.name, englishName(t)]));

  const root = h('div', { class: 'team-page' });
  let token = 0;

  const build = async (): Promise<Child[]> => {
    const mine = ++token;
    const names = getTeam();
    const members = (await Promise.all(names.map((name) => loadMember(name, labels)))).filter(
      (m): m is TeamMember => m !== null,
    );
    if (mine !== token || !ctx.isCurrent()) return [];
    return teamContent(names, members, types, (name) => removeFromTeam(name));
  };

  const refresh = async (): Promise<void> => {
    const content = await build();
    if (!content.length || !ctx.isCurrent()) return;
    root.replaceChildren(fragment(...content));
  };

  root.append(fragment(...(await build())));
  ctx.main.append(root);

  // Updates after a removal here, and when another tab changes the stored team.
  subscribeToTeam(() => {
    if (ctx.isCurrent()) void refresh();
  });

  return { title: 'Team', nav: 'team' };
}
