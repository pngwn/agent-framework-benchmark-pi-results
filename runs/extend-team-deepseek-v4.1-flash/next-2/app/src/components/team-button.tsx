'use client';

import { useState } from 'react';
import { readTeamCookie, TEAM_SIZE, writeTeamCookie } from '@/lib/team';

type Props = {
  /** Species API name. */
  species: string;
  onTeam: boolean;
  teamSize: number;
};

/** Adds or removes a species, keeping the browser's team cookie in sync. */
export function TeamButton({ species, onTeam, teamSize }: Props) {
  const [state, setState] = useState({ onTeam, teamSize });
  const [prev, setPrev] = useState({ onTeam, teamSize });

  // Follow server-rendered changes (for example after a router refresh).
  if (prev.onTeam !== onTeam || prev.teamSize !== teamSize) {
    setPrev({ onTeam, teamSize });
    setState({ onTeam, teamSize });
  }

  const full = state.teamSize >= TEAM_SIZE;

  function toggle() {
    const current = readTeamCookie();
    const next = current.includes(species)
      ? current.filter((name) => name !== species)
      : !full
        ? [...current, species]
        : current;
    writeTeamCookie(next);
    setState({ onTeam: next.includes(species), teamSize: next.length });
  }

  return (
    <div className="team-control">
      <button type="button" className="team-button" onClick={toggle} disabled={!state.onTeam && full}>
        {state.onTeam ? 'Remove from team' : 'Add to team'}
      </button>
      {!state.onTeam && full && <span className="team-full">Team is full</span>}
    </div>
  );
}
