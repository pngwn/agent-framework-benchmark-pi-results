import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { useLoaderData } from '@tanstack/react-router'
import { TEAM_SIZE, writeTeamCookie } from './team'

interface TeamContextValue {
  team: string[]
  has: (name: string) => boolean
  isFull: boolean
  add: (name: string) => void
  remove: (name: string) => void
}

const TeamContext = createContext<TeamContextValue | null>(null)

export function TeamProvider({ children }: { children: ReactNode }) {
  const initialTeam = useLoaderData({ from: '__root__' }).team
  const [team, setTeam] = useState(initialTeam)

  const commit = useCallback((next: string[]) => {
    setTeam(next)
    writeTeamCookie(next)
  }, [])

  const value = useMemo<TeamContextValue>(
    () => ({
      team,
      has: (name) => team.includes(name),
      isFull: team.length >= TEAM_SIZE,
      add: (name) => {
        if (team.includes(name) || team.length >= TEAM_SIZE) return
        commit([...team, name])
      },
      remove: (name) => commit(team.filter((member) => member !== name)),
    }),
    [team, commit],
  )

  return <TeamContext.Provider value={value}>{children}</TeamContext.Provider>
}

export function useTeam(): TeamContextValue {
  const value = useContext(TeamContext)
  if (!value) throw new Error('useTeam must be used inside TeamProvider')
  return value
}
