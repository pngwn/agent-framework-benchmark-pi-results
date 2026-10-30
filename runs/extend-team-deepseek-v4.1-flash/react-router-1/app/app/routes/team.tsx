import { Link } from "react-router";
import type { Route } from "./+types/team";
import { getIndex, speciesCard } from "../lib/api.server";
import { pageTitle } from "../lib/format";
import { computeCoverage, parseTeamCookie, useTeam, type CoverageRelation } from "../lib/team";
import { PokemonCards } from "../components/PokemonCards";
import { Section } from "../components/Section";
import type { Card } from "../lib/types";

export async function loader({ request }: Route.LoaderArgs) {
  const index = await getIndex();
  const team = parseTeamCookie(request.headers.get("Cookie"));
  const members = team
    .map((name) => {
      const species = index.speciesByName.get(name);
      return species ? speciesCard(index, species.id, true) : null;
    })
    .filter((card): card is Card => card !== null);

  const relations: CoverageRelation[] = index.types.map((type) => {
    const damage = index.damageRelations.get(type.name);
    return {
      name: type.name,
      label: type.label,
      doubleDamageTo: damage?.doubleDamageTo ?? [],
      halfDamageTo: damage?.halfDamageTo ?? [],
      noDamageTo: damage?.noDamageTo ?? [],
    };
  });

  return { members, relations };
}

export default function TeamPage({ loaderData }: Route.ComponentProps) {
  const { team, remove } = useTeam();
  const byName = new Map(loaderData.members.map((member) => [member.name, member]));
  const members = team.map((name) => byName.get(name)).filter((card): card is Card => card !== undefined);
  const coverage = computeCoverage(members, loaderData.relations);

  return (
    <>
      <title>{pageTitle("Team")}</title>
      <h1>Team</h1>
      <p className="count">{members.length} of 6</p>
      {members.length === 0 ? (
        <>
          <p className="page-message">Your team is empty</p>
          <p className="page-message">
            <Link to="/">Browse all Pokémon</Link>
          </p>
        </>
      ) : (
        <>
          <PokemonCards
            cards={members}
            action={(card) => (
              <button type="button" className="button team-card__remove" onClick={() => remove(card.name)}>
                Remove {card.label}
              </button>
            )}
          />
          <Section title="Type coverage">
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
