import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { MAX_TEAM_SIZE, writeTeamCookie } from './team'

interface TeamContextValue {
  team: string[]
  isFull: boolean
  has: (name: string) => boolean
  add: (name: string) => void
  remove: (name: string) => void
}

const TeamContext = createContext<TeamContextValue | null>(null)

export function TeamProvider({ initialTeam, children }: { initialTeam: string[]; children: ReactNode }) {
  const [team, setTeam] = useState(initialTeam)

  // Keep the browser cookie in sync with the in-memory team. The cookie is what lets the
  // server render the correct state on reloads and full-page navigations.
  useEffect(() => {
    writeTeamCookie(team)
  }, [team])

  const add = useCallback((name: string) => {
    setTeam((current) => {
      if (!name || current.includes(name) || current.length >= MAX_TEAM_SIZE) return current
      return [...current, name]
    })
  }, [])

  const remove = useCallback((name: string) => {
    setTeam((current) => current.filter((member) => member !== name))
  }, [])

  const value = useMemo<TeamContextValue>(
    () => ({
      team,
      isFull: team.length >= MAX_TEAM_SIZE,
      has: (name) => team.includes(name),
      add,
      remove,
    }),
    [team, add, remove],
  )

  return <TeamContext.Provider value={value}>{children}</TeamContext.Provider>
}

export function useTeam(): TeamContextValue {
  const value = useContext(TeamContext)
  if (!value) throw new Error('useTeam must be used inside a TeamProvider')
  return value
}
