import { useMemo } from 'react'
import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { getTeamPage } from '../server/functions'
import { humanize, pageTitle } from '../lib/format'
import { TEAM_SIZE } from '../lib/team'
import { PokemonCardList } from '../components/PokemonCard'
import { Section } from '../components/Section'
import { useTeam } from '../components/TeamProvider'

export const Route = createFileRoute('/team')({
  loader: () => getTeamPage(),
  head: () => ({ meta: [{ title: pageTitle('Team') }] }),
  component: TeamPage,
})

function TeamPage() {
  const data = Route.useLoaderData()
  const { team, remove } = useTeam()
  const router = useRouter()
  const typeLabels = useMemo(() => new Map(data.types.map((type) => [type.name, type.label])), [data.types])
  const members = data.members.filter((member) => team.includes(member.name))

  return (
    <div className="page">
      <h1>Team</h1>
      <p className="count">
        {team.length} of {TEAM_SIZE}
      </p>

      {team.length === 0 ? (
        <div className="empty-team">
          <p>Your team is empty</p>
          <Link to="/">Browse Pokémon</Link>
        </div>
      ) : (
        <>
          <PokemonCardList
            cards={members}
            typeLabels={typeLabels}
            renderAction={(card) => (
              <button
                type="button"
                className="button button-small"
                onClick={() => {
                  remove(card.name)
                  void router.invalidate()
                }}
              >
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
                  {data.coverage.map((row) => (
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
