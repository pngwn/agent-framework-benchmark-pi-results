import { useFetcher } from "react-router";

type ToggleProps = { species: string; inTeam: boolean; full: boolean };

/** Add/remove control on a Pokémon page. The team itself lives in a server cookie. */
export function TeamToggle({ species, inTeam, full }: ToggleProps) {
  const fetcher = useFetcher();
  return (
    <div className="team-actions">
      <fetcher.Form method="post" action="/team">
        <input type="hidden" name="intent" value={inTeam ? "remove" : "add"} />
        <input type="hidden" name="species" value={species} />
        <button type="submit" className="button" disabled={!inTeam && full}>
          {inTeam ? "Remove from team" : "Add to team"}
        </button>
      </fetcher.Form>
      {!inTeam && full && <span className="team-actions__note">Team is full</span>}
    </div>
  );
}

/** Remove control for a card on the team page. */
export function RemoveFromTeam({ species, label }: { species: string; label: string }) {
  const fetcher = useFetcher();
  return (
    <fetcher.Form method="post" action="/team" className="team-card__action">
      <input type="hidden" name="intent" value="remove" />
      <input type="hidden" name="species" value={species} />
      <button type="submit" className="team-card__remove">
        Remove {label}
      </button>
    </fetcher.Form>
  );
}
