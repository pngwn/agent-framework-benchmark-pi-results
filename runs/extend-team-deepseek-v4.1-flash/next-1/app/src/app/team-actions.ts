'use server';

import { revalidatePath } from 'next/cache';
import { getTeam, TEAM_SIZE, writeTeam } from '@/lib/team';

const NAME_PATTERN = /^[a-z0-9-]+$/;

function speciesName(formData: FormData): string | null {
  const value = String(formData.get('species') ?? '').trim().toLowerCase();
  return NAME_PATTERN.test(value) ? value : null;
}

/** Append a species to the end of the team (no duplicates, at most six). */
export async function addToTeam(formData: FormData): Promise<void> {
  const name = speciesName(formData);
  if (!name) return;

  const team = await getTeam();
  if (team.includes(name) || team.length >= TEAM_SIZE) return;

  await writeTeam([...team, name]);
  invalidateTeamViews();
}

/** Remove a species from the team, keeping the order of the rest. */
export async function removeFromTeam(formData: FormData): Promise<void> {
  const name = speciesName(formData);
  if (!name) return;

  const team = await getTeam();
  if (!team.includes(name)) return;

  await writeTeam(team.filter((member) => member !== name));
  invalidateTeamViews();
}

/** Refresh pages that render the team so a client-side navigation sees the new value. */
function invalidateTeamViews(): void {
  revalidatePath('/team');
  revalidatePath('/pokemon/[name]', 'page');
}
