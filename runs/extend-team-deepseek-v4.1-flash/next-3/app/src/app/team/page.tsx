import type { Metadata } from 'next';
import Link from 'next/link';
import { connection } from 'next/server';
import {
  getAllTypes,
  getPokemon,
  getSpecies,
  typeInfo,
  type ApiType,
  type CardData,
} from '@/lib/api';
import { englishName, idFromUrl } from '@/lib/format';
import { MAX_TEAM_SIZE } from '@/lib/team';
import { getTeam } from '@/lib/team-server';
import { PokemonCard } from '@/components/pokemon-cards';
import { TeamRemoveButton } from '@/components/team-remove-button';
import { Section } from '@/components/section';

export const metadata: Metadata = { title: 'Team' };

type Member = {
  card: CardData;
  /** API names of the default Pokémon's types, used for coverage. */
  types: string[];
};

async function loadTeam(team: string[]): Promise<{ members: Member[]; types: ApiType[] }> {
  const types = await getAllTypes();
  const labels = new Map(types.map((t) => [t.name, englishName(t.names, t.name)]));

  const loaded = await Promise.all(
    team.map(async (name): Promise<Member | null> => {
      const species = await getSpecies(name);
      if (!species) return null;
      const defaultVariety = species.varieties.find((v) => v.is_default)?.pokemon;
      const pokemon = await getPokemon(defaultVariety ? idFromUrl(defaultVariety.url) : species.id);
      if (!pokemon) return null;

      const memberTypes = [...pokemon.types].sort((a, b) => a.slot - b.slot).map((t) => t.type.name);
      return {
        card: { id: species.id, name: species.name, types: memberTypes.map((t) => typeInfo(labels, t)) },
        types: memberTypes,
      };
    }),
  );

  return { members: loaded.filter((member): member is Member => member !== null), types };
}

function coverageRows(members: Member[], types: ApiType[]) {
  return types.map((attacking) => {
    const double = new Set((attacking.damage_relations.double_damage_to ?? []).map((t) => t.name));
    const half = new Set((attacking.damage_relations.half_damage_to ?? []).map((t) => t.name));
    const none = new Set((attacking.damage_relations.no_damage_to ?? []).map((t) => t.name));

    const multiplier = (defending: string) => (none.has(defending) ? 0 : double.has(defending) ? 2 : half.has(defending) ? 0.5 : 1);

    let weak = 0;
    let resistant = 0;
    for (const member of members) {
      const damage = member.types.reduce((product, type) => product * multiplier(type), 1);
      if (damage > 1) weak++;
      else if (damage < 1) resistant++;
    }

    return { name: attacking.name, label: englishName(attacking.names, attacking.name), weak, resistant };
  });
}

export default async function TeamPage() {
  await connection();
  const team = await getTeam();
  const { members, types } = team.length > 0 ? await loadTeam(team) : { members: [], types: [] };

  return (
    <>
      <h1>Team</h1>
      <p className="team-count">
        {members.length} of {MAX_TEAM_SIZE}
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
              <li key={member.card.name}>
                <PokemonCard card={member.card} />
                <TeamRemoveButton name={member.card.name} />
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
                  {coverageRows(members, types).map((row) => (
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
