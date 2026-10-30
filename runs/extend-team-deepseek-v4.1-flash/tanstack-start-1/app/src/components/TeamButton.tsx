import { useTeam } from '../lib/team-context'

export function TeamButton({ name }: { name: string }) {
  const { has, isFull, add, remove } = useTeam()
  const isMember = has(name)
  const disabled = !isMember && isFull

  return (
    <div className="team-action">
      <button
        type="button"
        className="button"
        disabled={disabled}
        onClick={() => (isMember ? remove(name) : add(name))}
      >
        {isMember ? 'Remove from team' : 'Add to team'}
      </button>
      {disabled && <span className="team-full">Team is full</span>}
    </div>
  )
}
