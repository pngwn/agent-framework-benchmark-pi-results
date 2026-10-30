import { Title } from "@solidjs/meta";
import { A, createAsync } from "@solidjs/router";
import { For, Show } from "solid-js";
import PokemonCards from "~/components/PokemonCards";
import Section from "~/components/Section";
import { pageTitle } from "~/lib/format";
import { getTeamDetails } from "~/lib/queries";
import { useTeam } from "~/lib/team-store";
import { TEAM_LIMIT } from "~/lib/team";

export default function TeamPage() {
  const team = useTeam();
  const details = createAsync(() => getTeamDetails(team.team()));

  return (
    <>
      <Title>{pageTitle("Team")}</Title>
      <h1 class="page-title">Team</h1>
      <p class="count">{`${team.team().length} of ${TEAM_LIMIT}`}</p>
      <Show
        when={team.team().length}
        fallback={
          <p>
            Your team is empty. <A href="/">Browse Pokémon</A>
          </p>
        }
      >
        <Show when={details()}>
          {(result) => (
            <>
              <PokemonCards cards={result().cards} onRemove={(card) => team.remove(card.name)} />
              <Section title="Type coverage">
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
                      <For each={result().coverage}>
                        {(row) => (
                          <tr>
                            <th scope="row">{row.label}</th>
                            <td>{row.weak}</td>
                            <td>{row.resistant}</td>
                          </tr>
                        )}
                      </For>
                    </tbody>
                  </table>
                </div>
              </Section>
            </>
          )}
        </Show>
      </Show>
    </>
  );
}
