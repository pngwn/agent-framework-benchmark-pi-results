'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { humanize } from '@/lib/format';
import { readTeamCookie, writeTeamCookie } from '@/lib/team';

/** Removes a species from the browser's team, then re-renders the server page. */
export function RemoveButton({ name }: { name: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function remove() {
    writeTeamCookie(readTeamCookie().filter((member) => member !== name));
    startTransition(() => router.refresh());
  }

  return (
    <button type="button" className="team-remove" onClick={remove} aria-busy={pending || undefined}>
      Remove {humanize(name)}
    </button>
  );
}
