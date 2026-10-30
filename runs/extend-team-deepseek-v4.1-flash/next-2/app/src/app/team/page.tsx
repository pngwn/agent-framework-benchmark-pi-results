import type { Metadata } from 'next';
import Link from 'next/link';
import { connection } from 'next/server';
import { getAllTypes, getPokemon, getSpecies, typeInfo, type ApiType, type TypeInfo } from '@/lib/api';
import { englishName, idFromUrl } from '@/lib/format';
import { getTeam } from '@/lib/team-server';
import { TEAM_SIZE } from '@/lib/team';
import { Section } from '@/components/section';
import { PokemonCard } from '@/components/pokemon-cards';
import { RemoveButton } from './remove-button';

export const metadata: Metadata = { title: 'Team' };

type TeamMember = { id: number; name: string; types: TypeInfo[] };

/** The multiplier an attacking type applies to a defending type. */
function damageMultiplier(attacking: ApiType, defending: string): number {
  const { damage_relations: relations } = attacking;
  if (relations.no_damage_to.some((t) => t.name === defending)) return 0;
  if (relations.double_damage_to.some((t) => t.name === defending)) return 2;
  if (relations.half_damage_to.some((t) => t.name === defending)) return 0.5;
  return 1;
}

/** Load the team's species and their default Pokémon's types, in the order they were added. */
async function loadMembers(names: string[], labels: Map<string, string>): Promise<TeamMember[]> {
  const species = await Promise.all(names.map((name) => getSpecies(name)));
  const members = await Promise.all(
    species.map(async (s) => {
      if (!s) return null;
      const defaultVariety = s.varieties.find((v) => v.is_default)?.pokemon;
      const pokemon = await getPokemon(defaultVariety ? idFromUrl(defaultVariety.url) : s.id);
      if (!pokemon) return null;
      const types = [...pokemon.types]
        .sort((a, b) => a.slot - b.slot)
        .map((t) => typeInfo(labels, t.type.name));
      return { id: s.id, name: s.name, types };
    }),
  );
  return members.filter((member): member is TeamMember => member !== null);
}

export default async function TeamPage() {
  await connection();
  const [names, types] = await Promise.all([getTeam(), getAllTypes()]);
  const labels = new Map(types.map((t) => [t.name, englishName(t.names, t.name)]));
  const members = await loadMembers(names, labels);

  const coverage = types.map((type) => {
    let weak = 0;
    let resistant = 0;
    for (const member of members) {
      const multiplier = member.types.reduce(
        (product, memberType) => product * damageMultiplier(type, memberType.name),
        1,
      );
      if (multiplier > 1) weak++;
      else if (multiplier < 1) resistant++;
    }
    return { name: type.name, label: englishName(type.names, type.name), weak, resistant };
  });

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
            <Link href="/">Browse Pokémon</Link>
          </p>
        </>
      ) : (
        <>
          <ul className="card-grid team-grid">
            {members.map((member) => (
              <li key={member.id} className="team-grid-item">
                <PokemonCard card={member} />
                <RemoveButton name={member.name} />
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
                    <tr key={row.name} className={`coverage-${row.name}`}>
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
