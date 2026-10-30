import { data, Link } from "react-router";
import type { Route } from "./+types/team";
import { getIndex, speciesCard } from "../lib/api.server";
import { addTeamMember, readTeam, removeTeamMember, teamCookie } from "../lib/team.server";
import { MAX_TEAM_SIZE } from "../lib/team";
import { pageTitle } from "../lib/format";
import { Section } from "../components/Section";
import { PokemonCards } from "../components/PokemonCards";
import { RemoveFromTeam } from "../components/TeamControls";
import type { Card } from "../lib/types";

/** Damage multiplier of an attacking type against one defending type. */
function multiplier(attack: { doubleTo: Set<string>; halfTo: Set<string>; noTo: Set<string> }, defend: string): number {
  if (attack.noTo.has(defend)) return 0;
  if (attack.doubleTo.has(defend)) return 2;
  if (attack.halfTo.has(defend)) return 0.5;
  return 1;
}

export async function loader({ request }: Route.LoaderArgs) {
  const index = await getIndex();
  const members = readTeam(request)
    .map((name) => index.species.find((species) => species.name === name))
    .filter((species): species is NonNullable<typeof species> => species !== undefined);

  const cards = members
    .map((species) => speciesCard(index, species.id, true))
    .filter((card): card is Card => card !== null);
  const memberTypes = members.map((species) => index.speciesTypes.get(species.id) ?? []);

  const coverage = index.types.map((type) => {
    const damage = index.typeDamage.get(type.name);
    let weak = 0;
    let resistant = 0;
    for (const types of memberTypes) {
      const total = damage ? types.reduce((product, defend) => product * multiplier(damage, defend), 1) : 1;
      if (total > 1) weak += 1;
      else if (total < 1) resistant += 1;
    }
    return { name: type.name, label: type.label, weak, resistant };
  });

  return { count: cards.length, cards, coverage };
}

export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");
  const species = String(form.get("species") ?? "").trim().toLowerCase();
  const current = readTeam(request);

  let next = current;
  if (intent === "add") next = addTeamMember(current, species);
  else if (intent === "remove") next = removeTeamMember(current, species);
  else throw data("Bad request", { status: 400 });

  return data({ team: next }, { headers: { "Set-Cookie": teamCookie(next) } });
}

export default function TeamPage({ loaderData }: Route.ComponentProps) {
  const d = loaderData;
  return (
    <>
      <title>{pageTitle("Team")}</title>
      <h1>Team</h1>
      <p className="count">
        {d.count} of {MAX_TEAM_SIZE}
      </p>
      {d.count === 0 ? (
        <>
          <p className="page-message">Your team is empty</p>
          <p className="page-message">
            <Link to="/">Browse the Pokédex</Link>
          </p>
        </>
      ) : (
        <>
          <PokemonCards
            cards={d.cards}
            itemExtra={(card) => <RemoveFromTeam species={card.name} label={card.label} />}
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
                  {d.coverage.map((row) => (
                    <tr key={row.name}>
                      <th scope="row" className={`type-text type-text-${row.name}`}>
                        {row.label}
                      </th>
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
