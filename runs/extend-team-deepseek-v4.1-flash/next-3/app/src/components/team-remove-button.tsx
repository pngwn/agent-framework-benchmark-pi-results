'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { humanize } from '@/lib/format';
import { readTeamCookie, writeTeamCookie } from '@/lib/team';

/** Remove one species from the team page. */
export function TeamRemoveButton({ name }: { name: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function remove() {
    writeTeamCookie(readTeamCookie().filter((member) => member !== name));
    startTransition(() => router.refresh());
  }

  return (
    <button type="button" className="button team-remove" onClick={remove} disabled={pending}>
      Remove {humanize(name)}
    </button>
  );
}
