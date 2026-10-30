'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { MAX_TEAM_SIZE, readTeamCookie, writeTeamCookie } from '@/lib/team';

type Props = { name: string; inTeam: boolean; full: boolean };

/** Add/remove control for one species; the cookie is the source of truth. */
export function TeamToggle({ name, inTeam: initialInTeam, full: initialFull }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState({ inTeam: initialInTeam, full: initialFull });
  const [previous, setPrevious] = useState({ inTeam: initialInTeam, full: initialFull });

  // Follow server refreshes and navigations that changed the rendered team state.
  if (previous.inTeam !== initialInTeam || previous.full !== initialFull) {
    setPrevious({ inTeam: initialInTeam, full: initialFull });
    setState({ inTeam: initialInTeam, full: initialFull });
  }

  function toggle() {
    const team = readTeamCookie();
    const isInTeam = team.includes(name);
    const next = isInTeam
      ? team.filter((member) => member !== name)
      : team.length >= MAX_TEAM_SIZE
        ? team
        : [...team, name];
    writeTeamCookie(next);
    setState({ inTeam: next.includes(name), full: next.length >= MAX_TEAM_SIZE });
    startTransition(() => router.refresh());
  }

  const disabled = !state.inTeam && state.full;

  return (
    <div className="team-toggle">
      <button
        type="button"
        className="button"
        onClick={toggle}
        disabled={disabled}
        aria-busy={pending || undefined}
      >
        {state.inTeam ? 'Remove from team' : 'Add to team'}
      </button>
      {disabled && <span className="team-status">Team is full</span>}
    </div>
  );
}
