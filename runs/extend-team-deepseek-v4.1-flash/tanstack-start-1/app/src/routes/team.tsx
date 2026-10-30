import { Link, createFileRoute } from '@tanstack/react-router'
import { getTeamData } from '../server/functions'
import { humanize, pageTitle } from '../lib/format'
import { typeCoverage } from '../lib/coverage'
import { useTeam } from '../lib/team-context'
import type { CardData } from '../lib/types'
import { Section } from '../components/Section'
import { PokemonCardList } from '../components/PokemonCard'

export const Route = createFileRoute('/team')({
  loader: () => getTeamData(),
  // Membership lives in a cookie, so never reuse loader data from an older request.
  staleTime: 0,
  head: () => ({ meta: [{ title: pageTitle('Team') }] }),
  component: TeamPage,
})

function TeamPage() {
  const data = Route.useLoaderData()
  const { team, remove } = useTeam()

  // The loader fetched the team from the cookie. The context can change first when a
  // member is removed on this page, so render from it and filter the loaded data.
  const byName = new Map(data.members.map((member) => [member.name, member]))
  const members = team
    .map((name) => byName.get(name))
    .filter((member): member is CardData => member !== undefined)
  const typeLabels = new Map(data.types.map((type) => [type.name, type.label]))
  const coverage = typeCoverage(data.attackTypes, members)

  return (
    <div className="page">
      <h1>Team</h1>
      <p className="count">
        {members.length} of 6
      </p>

      {members.length === 0 ? (
        <div className="panel empty-panel">
          <p className="empty">Your team is empty</p>
          <p>
            <Link to="/">Browse the Pokédex</Link>
          </p>
        </div>
      ) : (
        <>
          <PokemonCardList
            cards={members}
            typeLabels={typeLabels}
            renderAction={(card) => (
              <button type="button" className="button button-small" onClick={() => remove(card.name)}>
                Remove {humanize(card.name)}
              </button>
            )}
          />

          <Section title="Type coverage">
            <div className="table-scroll">
              <table className="coverage-table">
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
    </div>
  )
}
