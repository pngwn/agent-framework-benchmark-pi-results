import { component$, useComputed$, useSignal } from "@builder.io/qwik";
import { Link, routeLoader$, type DocumentHead } from "@builder.io/qwik-city";
import { PokemonCard, Section } from "~/components/ui";
import { teamPage } from "~/lib/data";
import { pageTitle } from "~/lib/format";
import {
  computeCoverage,
  parseTeam,
  removeTeamMember,
  TEAM_COOKIE,
  writeTeamCookie,
} from "~/lib/team";

export const useTeam = routeLoader$(({ cookie }) => teamPage(parseTeam(cookie.get(TEAM_COOKIE)?.value)));

export default component$(() => {
  const loader = useTeam();
  const team = useSignal(loader.value.cards);
  const coverage = useComputed$(() => computeCoverage(team.value, loader.value.attacks));

  return (
    <>
      <h1>Team</h1>
      <p class="count">{team.value.length} of 6</p>

      {team.value.length === 0 ? (
        <>
          <p class="empty">Your team is empty</p>
          <p class="empty-link">
            <Link href="/">Browse Pokémon</Link>
          </p>
        </>
      ) : (
        <>
          <ul class="card-grid team-grid">
            {team.value.map((card) => (
              <li key={card.id} class="team-card">
                <PokemonCard card={card} />
                <button
                  type="button"
                  class="team-remove"
                  onClick$={() => {
                    const names = removeTeamMember(
                      team.value.map((c) => c.name),
                      card.name,
                    );
                    team.value = team.value.filter((c) => c.name !== card.name);
                    writeTeamCookie(names);
                  }}
                >
                  Remove {card.label}
                </button>
              </li>
            ))}
          </ul>

          <Section id="coverage" title="Type coverage">
            <table class="coverage-table">
              <thead>
                <tr>
                  <th scope="col">Type</th>
                  <th scope="col">Weak</th>
                  <th scope="col">Resistant</th>
                </tr>
              </thead>
              <tbody>
                {coverage.value.map((row) => (
                  <tr key={row.name}>
                    <th scope="row">{row.label}</th>
                    <td>{row.weak}</td>
                    <td>{row.resistant}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        </>
      )}
    </>
  );
});

export const head: DocumentHead = { title: pageTitle("Team") };
