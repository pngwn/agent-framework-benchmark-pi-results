import { component$, useComputed$, useSignal, useTask$ } from "@builder.io/qwik";
import { Link, routeLoader$, type DocumentHead } from "@builder.io/qwik-city";
import { PokemonCard, Section } from "~/components/ui";
import { teamPage } from "~/lib/data";
import { pageTitle } from "~/lib/format";
import { MAX_TEAM_SIZE, parseTeam, saveTeamCookie, TEAM_COOKIE, typeCoverage } from "~/lib/team";

export const useTeam = routeLoader$(({ cookie }) => teamPage(parseTeam(cookie.get(TEAM_COOKIE)?.value)));

export default component$(() => {
  const loader = useTeam();
  const entries = useSignal(loader.value.entries);
  const names = useSignal(loader.value.names);

  // Keep the local team in sync when navigation loads a newer value.
  useTask$(({ track }) => {
    const loadedNames = track(() => loader.value.names);
    if (loadedNames !== names.value) {
      names.value = loadedNames;
      entries.value = loader.value.entries;
    }
  });

  const coverage = useComputed$(() => typeCoverage(entries.value, loader.value.types));

  return (
    <>
      <h1>Team</h1>
      <p class="count">
        {names.value.length} of {MAX_TEAM_SIZE}
      </p>

      {names.value.length === 0 ? (
        <>
          <p class="empty">Your team is empty</p>
          <p class="empty-link">
            <Link href="/">Browse all Pokémon</Link>
          </p>
        </>
      ) : (
        <>
          <ul class="card-grid team-grid">
            {entries.value.map((entry) => (
              <li key={entry.name}>
                <PokemonCard card={entry.card} />
                <button
                  type="button"
                  class="remove-button"
                  onClick$={() => {
                    const nextNames = names.value.filter((name) => name !== entry.name);
                    names.value = nextNames;
                    entries.value = entries.value.filter((member) => member.name !== entry.name);
                    saveTeamCookie(nextNames);
                  }}
                >
                  Remove {entry.card.label}
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
