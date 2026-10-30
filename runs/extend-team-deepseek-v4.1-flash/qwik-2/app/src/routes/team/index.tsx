import { $, component$, useSignal, useTask$ } from "@builder.io/qwik";
import { Link, routeLoader$, type DocumentHead } from "@builder.io/qwik-city";
import { PokemonCard, Section } from "~/components/ui";
import { teamPage } from "~/lib/data";
import { pageTitle } from "~/lib/format";
import {
  coverageRows,
  parseTeamCookie,
  readTeamCookie,
  TEAM_COOKIE,
  TEAM_SIZE,
  writeTeamCookie,
} from "~/lib/team";

export const useTeam = routeLoader$(({ cookie }) =>
  teamPage(parseTeamCookie(cookie.get(TEAM_COOKIE)?.value)),
);

export default component$(() => {
  const loaded = useTeam();
  const members = useSignal(loaded.value.members);
  const coverage = useSignal(loaded.value.coverage);
  const relations = useSignal(loaded.value.relations);

  useTask$(({ track }) => {
    const current = track(() => loaded.value);
    members.value = current.members;
    coverage.value = current.coverage;
    relations.value = current.relations;
  });

  const remove = $((name: string) => {
    const next = readTeamCookie().filter((member) => member !== name);
    writeTeamCookie(next);
    members.value = members.value.filter((member) => member.card.name !== name);
    coverage.value = coverageRows(members.value, relations.value);
  });

  return (
    <>
      <h1>Team</h1>
      <p class="count">
        {members.value.length} of {TEAM_SIZE}
      </p>

      {members.value.length === 0 ? (
        <>
          <p class="empty">Your team is empty</p>
          <p class="empty-link">
            <Link href="/">Browse Pokémon</Link>
          </p>
        </>
      ) : (
        <>
          <ul class="card-grid team-grid">
            {members.value.map((member) => (
              <li key={member.card.id} class="team-card">
                <PokemonCard card={member.card} />
                <button
                  type="button"
                  class="remove-button"
                  onClick$={() => remove(member.card.name)}
                >
                  Remove {member.card.label}
                </button>
              </li>
            ))}
          </ul>

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
                  {coverage.value.map((row) => (
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
});

export const head: DocumentHead = { title: pageTitle("Team") };
