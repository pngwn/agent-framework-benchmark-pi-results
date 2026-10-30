import { TEAM_SIZE } from '../lib/team'
import { useTeam } from './TeamProvider'

export function TeamButton({ name }: { name: string }) {
  const { team, add, remove } = useTeam()
  const onTeam = team.includes(name)
  const full = team.length >= TEAM_SIZE

  return (
    <div className="team-actions">
      <button
        type="button"
        className="button"
        disabled={!onTeam && full}
        onClick={() => (onTeam ? remove(name) : add(name))}
      >
        {onTeam ? 'Remove from team' : 'Add to team'}
      </button>
      {!onTeam && full && <span className="team-full">Team is full</span>}
    </div>
  )
}
