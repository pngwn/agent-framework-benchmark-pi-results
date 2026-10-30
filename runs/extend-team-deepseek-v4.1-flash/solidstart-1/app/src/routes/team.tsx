import { Title } from "@solidjs/meta";
import { A, createAsync, type RouteDefinition } from "@solidjs/router";
import { For, Show } from "solid-js";
import PokemonCards from "~/components/PokemonCards";
import Section from "~/components/Section";
import { pageTitle } from "~/lib/format";
import { getTeamDetails } from "~/lib/queries";
import { readTeam, useTeam } from "~/lib/team";

export const route = {
  preload: () => getTeamDetails(readTeam()),
} satisfies RouteDefinition;

export default function TeamPage() {
  const team = useTeam();
  const details = createAsync(() => getTeamDetails(team.members()));

  return (
    <>
      <Title>{pageTitle("Team")}</Title>
      <h1 class="page-title">Team</h1>
      <p class="count">{`${team.members().length} of 6`}</p>
      <Show
        when={team.members().length > 0}
        fallback={
          <p>
            Your team is empty. <A href="/">Browse Pokémon</A> to add some.
          </p>
        }
      >
        <Show when={details()}>
          {(result) => (
            <>
              <PokemonCards
                cards={result().members}
                action={(card) => (
                  <button type="button" class="team-card__remove" onClick={() => team.remove(card.name)}>
                    {`Remove ${card.label}`}
                  </button>
                )}
              />
              <Show when={result().coverage.length}>
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
                              <th scope="row">{row.type.label}</th>
                              <td>{row.weak}</td>
                              <td>{row.resistant}</td>
                            </tr>
                          )}
                        </For>
                      </tbody>
                    </table>
                  </div>
                </Section>
              </Show>
            </>
          )}
        </Show>
      </Show>
    </>
  );
}
