import type { Context } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { allSpecies, humanize, mainTypes, typesByPokemonId, type Card } from '../data';
import { CardList, Section } from './components';

export const TEAM_SIZE = 6;
const TEAM_COOKIE = 'team';
const TEAM_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** Species names on the team, in the order they were added. */
export function readTeam(c: Context): string[] {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const name of (getCookie(c, TEAM_COOKIE) ?? '').split(',')) {
    const trimmed = name.trim().toLowerCase();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    names.push(trimmed);
    if (names.length === TEAM_SIZE) break;
  }
  return names;
}

function writeTeam(c: Context, names: string[]) {
  if (names.length === 0) {
    deleteCookie(c, TEAM_COOKIE, { path: '/' });
    return;
  }
  setCookie(c, TEAM_COOKIE, names.join(','), {
    path: '/',
    httpOnly: true,
    sameSite: 'Lax',
    maxAge: TEAM_COOKIE_MAX_AGE,
  });
}

export async function addToTeam(c: Context, name: string) {
  const team = readTeam(c);
  const key = name.toLowerCase();
  if (!team.includes(key) && team.length < TEAM_SIZE) {
    team.push(key);
    writeTeam(c, team);
  }
  return team;
}

export async function removeFromTeam(c: Context, name: string) {
  const key = name.toLowerCase();
  const team = readTeam(c).filter((n) => n !== key);
  writeTeam(c, team);
  return team;
}

export async function loadTeam(c: Context, names = readTeam(c)) {
  const [species, types] = await Promise.all([allSpecies(), mainTypes()]);
  const typesById = await typesByPokemonId(types);
  const byName = new Map(species.map((s) => [s.name, s]));
  const members: Card[] = [];
  for (const name of names) {
    const s = byName.get(name);
    if (s) members.push({ ...s, types: typesById.get(s.id) ?? [] });
  }
  return { members, types };
}

type TeamData = Awaited<ReturnType<typeof loadTeam>>;

const relatedTypes = (record: any, key: string): Set<string> =>
  new Set(((record?.damage_relations?.[key] ?? []) as { name: string }[]).map((t) => t.name));

const multiplier = (attacking: Set<string>, resisting: Set<string>, immune: Set<string>, type: string) =>
  immune.has(type) ? 0 : attacking.has(type) ? 2 : resisting.has(type) ? 0.5 : 1;

/** How many team members each attacking type hits for more/less than normal damage. */
function typeCoverage(data: TeamData) {
  return data.types.map(({ label, record }) => {
    const double = relatedTypes(record, 'double_damage_to');
    const half = relatedTypes(record, 'half_damage_to');
    const none = relatedTypes(record, 'no_damage_to');
    let weak = 0;
    let resistant = 0;
    for (const member of data.members) {
      const damage = (member.types ?? []).reduce(
        (total, t) => total * multiplier(double, half, none, t.name),
        1,
      );
      if (damage > 1) weak++;
      else if (damage < 1) resistant++;
    }
    return { label, weak, resistant };
  });
}

export const TeamButton = ({ name, onTeam, full }: { name: string; onTeam: boolean; full: boolean }) => {
  const disabled = !onTeam && full;
  return (
    <span class="team-action">
      <button
        type="button"
        class="action-button"
        hx-post={`/team/${onTeam ? 'remove' : 'add'}/${encodeURIComponent(name)}`}
        hx-target="closest .team-action"
        hx-swap="outerHTML"
        {...(disabled ? { disabled: true } : {})}
      >
        {onTeam ? 'Remove from team' : 'Add to team'}
      </button>
      {disabled && <span class="team-full">Team is full</span>}
    </span>
  );
};

export const TeamContent = ({ data }: { data: TeamData }) => {
  const { members } = data;
  return (
    <div id="team-content">
      <p class="count">{members.length} of {TEAM_SIZE}</p>
      {members.length === 0 ? (
        <div class="empty-team">
          <p>Your team is empty</p>
          <p>
            <a href="/">Browse Pokémon</a>
          </p>
        </div>
      ) : (
        <>
          <CardList
            cards={members}
            action={(card) => (
              <button
                type="button"
                class="remove-button"
                hx-post={`/team/remove/${encodeURIComponent(card.name)}?from=team`}
                hx-target="#team-content"
                hx-swap="outerHTML"
              >
                Remove {humanize(card.name)}
              </button>
            )}
          />
          <Section id="coverage" title="Type coverage">
            <div class="table-scroll">
              <table class="coverage-table">
                <thead>
                  <tr>
                    <th scope="col">Type</th>
                    <th scope="col">Weak</th>
                    <th scope="col">Resistant</th>
                  </tr>
                </thead>
                <tbody>
                  {typeCoverage(data).map((row) => (
                    <tr>
                      <th scope="row">{row.label}</th>
                      <td>{row.weak}</td>
                      <td>{row.resistant}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        </>
      )}
    </div>
  );
};

export const TeamPage = ({ data }: { data: TeamData }) => (
  <>
    <h1>Team</h1>
    <TeamContent data={data} />
  </>
);
