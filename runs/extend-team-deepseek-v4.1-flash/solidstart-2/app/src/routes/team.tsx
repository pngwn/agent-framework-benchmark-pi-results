import { Title } from "@solidjs/meta";
import { A, createAsync } from "@solidjs/router";
import { For, Show } from "solid-js";
import PokemonCards from "~/components/PokemonCards";
import Section from "~/components/Section";
import { pageTitle } from "~/lib/format";
import { getTeam } from "~/lib/queries";
import { useTeam } from "~/lib/team";

export default function TeamPage() {
  const team = useTeam();
  const detail = createAsync(() => getTeam(team.names()));
  const members = () => detail()?.members ?? [];

  return (
    <>
      <Title>{pageTitle("Team")}</Title>
      <h1 class="page-title">Team</h1>
      <p class="count">{`${members().length} of 6`}</p>
      <Show
        when={members().length}
        fallback={
          <>
            <p>Your team is empty</p>
            <p class="empty-link">
              <A href="/">Browse the Pokédex</A>
            </p>
          </>
        }
      >
        <PokemonCards cards={members()} onRemove={(card) => team.remove(card.name)} />
        <Show when={detail()?.coverage.length}>
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
                  <For each={detail()?.coverage}>
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
      </Show>
    </>
  );
}
