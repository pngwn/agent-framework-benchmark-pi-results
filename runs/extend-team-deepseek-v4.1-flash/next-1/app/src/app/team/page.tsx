import type { Metadata } from 'next';
import Link from 'next/link';
import { connection } from 'next/server';
import { getAllTypes, getTeamMembers, type ApiType, type TeamMember } from '@/lib/api';
import { englishName, humanize } from '@/lib/format';
import { TEAM_SIZE, getTeam } from '@/lib/team';
import { PokemonCard } from '@/components/pokemon-cards';
import { Section } from '@/components/section';
import { removeFromTeam } from '../team-actions';

export const metadata: Metadata = { title: 'Team' };

type CoverageRow = { name: string; label: string; weak: number; resistant: number };

const names = (list: { name: string }[]) => new Set(list.map((entry) => entry.name));

/** Damage each type does to the team, treating it as the attacking type. */
function typeCoverage(types: ApiType[], members: TeamMember[]): CoverageRow[] {
  return types.map((type) => {
    const double = names(type.damage_relations.double_damage_to);
    const half = names(type.damage_relations.half_damage_to);
    const none = names(type.damage_relations.no_damage_to);

    let weak = 0;
    let resistant = 0;
    for (const member of members) {
      let multiplier = 1;
      for (const defender of member.types) {
        if (none.has(defender.name)) multiplier *= 0;
        else if (half.has(defender.name)) multiplier *= 0.5;
        else if (double.has(defender.name)) multiplier *= 2;
      }
      if (multiplier > 1) weak++;
      else if (multiplier < 1) resistant++;
    }

    return { name: type.name, label: englishName(type.names, type.name), weak, resistant };
  });
}

export default async function TeamPage() {
  await connection();
  const [team, types] = await Promise.all([getTeam(), getAllTypes()]);
  const labels = new Map(types.map((type) => [type.name, englishName(type.names, type.name)]));
  const members = team.length > 0 ? await getTeamMembers(team, labels) : [];
  const coverage = members.length > 0 ? typeCoverage(types, members) : [];

  return (
    <>
      <h1>Team</h1>
      <p className="count">
        {members.length} of {TEAM_SIZE}
      </p>
      {members.length === 0 ? (
        <>
          <p>Your team is empty</p>
          <p>
            <Link href="/">Browse the Pokédex</Link>
          </p>
        </>
      ) : (
        <>
          <ul className="card-grid team-grid">
            {members.map((member) => (
              <li key={member.name} className="team-item">
                <PokemonCard card={member} />
                <form action={removeFromTeam} className="team-remove">
                  <input type="hidden" name="species" value={member.name} />
                  <button type="submit" className="button button-secondary">
                    Remove {humanize(member.name)}
                  </button>
                </form>
              </li>
            ))}
          </ul>
          <Section id="type-coverage" title="Type coverage">
            <div className="table-scroll">
              <table className="coverage">
                <thead>
                  <tr>
                    <th scope="col">Type</th>
                    <th scope="col">Weak</th>
                    <th scope="col">Resistant</th>
                  </tr>
                </thead>
                <tbody>
                  {coverage.map((row) => (
                    <tr key={row.name}>
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
    </>
  );
}
