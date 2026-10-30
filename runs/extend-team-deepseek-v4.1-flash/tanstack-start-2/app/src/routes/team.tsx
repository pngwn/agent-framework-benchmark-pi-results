import { Link, createFileRoute } from '@tanstack/react-router'
import { getTeamPage } from '../server/functions'
import { pageTitle } from '../lib/format'
import { removeButtonName, TEAM_SIZE } from '../lib/team'
import { useTeam } from '../lib/team-context'
import type { CardData } from '../lib/types'

type TeamMember = CardData & { types: string[] }
import { PokemonCardList } from '../components/PokemonCard'
import { Section } from '../components/Section'
import { TeamCoverage } from '../components/TeamCoverage'

export const Route = createFileRoute('/team')({
  loader: () => getTeamPage(),
  head: () => ({ meta: [{ title: pageTitle('Team') }] }),
  component: TeamPage,
})

function TeamPage() {
  const data = Route.useLoaderData()
  const { team, remove } = useTeam()

  const loaded = new Map(data.members.map((member) => [member.name, member]))
  const members = team
    .map((name) => loaded.get(name))
    .filter((member): member is TeamMember => Boolean(member))
  const typeLabels = new Map(data.types.map((type) => [type.name, type.label]))

  return (
    <div className="page">
      <h1>Team</h1>
      <p className="count">
        {team.length} of {TEAM_SIZE}
      </p>

      {team.length === 0 ? (
        <div className="empty-team">
          <p>Your team is empty</p>
          <p>
            <Link to="/">Browse Pokémon</Link>
          </p>
        </div>
      ) : (
        <>
          <PokemonCardList
            cards={members}
            typeLabels={typeLabels}
            action={(card) => (
              <button type="button" className="card-action" onClick={() => remove(card.name)}>
                {removeButtonName(card.name)}
              </button>
            )}
          />
          <Section title="Type coverage">
            <TeamCoverage members={members} types={data.types} relations={data.relations} />
          </Section>
        </>
      )}
    </div>
  )
}
