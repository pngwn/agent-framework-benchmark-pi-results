import { useEffect } from "react";
import { Link, useRevalidator } from "react-router";
import type { Route } from "./+types/team";
import { getIndex, speciesCard } from "../lib/api.server";
import { pageTitle } from "../lib/format";
import { readTeamCookie, typeCoverage, type TeamMember } from "../lib/team";
import { useTeam } from "../components/TeamProvider";
import { PokemonCards } from "../components/PokemonCards";
import { Section } from "../components/Section";

export async function loader({ request }: Route.LoaderArgs) {
  const teamNames = readTeamCookie(request.headers.get("Cookie"));
  const index = await getIndex();
  const members = teamNames
    .map((name) => {
      const species = index.species.find((s) => s.name === name);
      const card = species ? speciesCard(index, species.id, true) : null;
      return card ? ({ ...card, types: card.types ?? [] } satisfies TeamMember) : null;
    })
    .filter((member): member is TeamMember => member !== null);

  return { teamNames, members, relations: index.typeRelations };
}

export default function TeamPage({ loaderData }: Route.ComponentProps) {
  const { team, remove } = useTeam();
  const revalidator = useRevalidator();

  // If the team changed on another page since this route loaded, refresh its API data.
  useEffect(() => {
    if (team.join(",") !== loaderData.teamNames.join(",")) revalidator.revalidate();
  }, [team, revalidator, loaderData.teamNames]);

  const members = loaderData.members.filter((member) => team.includes(member.name));
  const coverage = typeCoverage(members, loaderData.relations);

  return (
    <>
      <title>{pageTitle("Team")}</title>
      <h1>Team</h1>
      <p className="count">{team.length} of 6</p>
      {team.length === 0 ? (
        <>
          <p className="page-message">Your team is empty</p>
          <p className="page-message">
            <Link to="/">Browse Pokémon</Link>
          </p>
        </>
      ) : (
        <>
          <PokemonCards
            cards={members}
            action={(card) => (
              <button
                type="button"
                className="button button--secondary team-remove"
                onClick={() => remove(card.name)}
              >
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
