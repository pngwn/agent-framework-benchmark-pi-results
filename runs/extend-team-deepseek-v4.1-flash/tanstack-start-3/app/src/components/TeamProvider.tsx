import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { TEAM_SIZE, writeTeamCookie } from '../lib/team'

interface TeamContextValue {
  team: string[]
  add: (name: string) => void
  remove: (name: string) => void
}

const TeamContext = createContext<TeamContextValue | null>(null)

export function TeamProvider({ initialTeam, children }: { initialTeam: string[]; children: ReactNode }) {
  const [team, setTeam] = useState(initialTeam)

  const add = useCallback((name: string) => {
    setTeam((current) => {
      if (current.includes(name) || current.length >= TEAM_SIZE) return current
      const next = [...current, name]
      writeTeamCookie(next)
      return next
    })
  }, [])

  const remove = useCallback((name: string) => {
    setTeam((current) => {
      if (!current.includes(name)) return current
      const next = current.filter((entry) => entry !== name)
      writeTeamCookie(next)
      return next
    })
  }, [])

  const value = useMemo(() => ({ team, add, remove }), [team, add, remove])

  return <TeamContext.Provider value={value}>{children}</TeamContext.Provider>
}

export function useTeam(): TeamContextValue {
  const team = useContext(TeamContext)
  if (!team) throw new Error('useTeam must be used inside TeamProvider')
  return team
}
