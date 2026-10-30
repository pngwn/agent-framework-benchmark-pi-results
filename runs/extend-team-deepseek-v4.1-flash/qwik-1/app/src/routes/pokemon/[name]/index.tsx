import { component$, useSignal, useTask$ } from "@builder.io/qwik";
import { Link, routeLoader$, useNavigate, type DocumentHead } from "@builder.io/qwik-city";
import { MoveTable } from "~/components/move-table";
import { Evolution, NotFound, Section, TypeBadge } from "~/components/ui";
import { pokemonPage } from "~/lib/data";
import { dexNumber, orDash, pageTitle } from "~/lib/format";
import { MAX_TEAM_SIZE, normalizeTeam, parseTeam, saveTeamCookie, TEAM_COOKIE } from "~/lib/team";

export const usePokemon = routeLoader$(async ({ params, url, status, cookie }) => {
  const data = await pokemonPage(params.name, url.searchParams.get("game"));
  if (!data) status(404);
  return data ? { ...data, team: parseTeam(cookie.get(TEAM_COOKIE)?.value) } : null;
});

const MAX_STAT = 255;

export default component$(() => {
  const loader = usePokemon();
  const nav = useNavigate();
  const p = loader.value;
  const team = useSignal<string[]>(p?.team ?? []);

  // Keep the local team in sync when navigation loads a newer value.
  useTask$(({ track }) => {
    const loaded = track(() => loader.value?.team);
    if (loaded) team.value = loaded;
  });

  if (!p) return <NotFound />;

  const onTeam = team.value.includes(p.name);
  const teamFull = !onTeam && team.value.length >= MAX_TEAM_SIZE;

  return (
    <>
      <div class="pokemon-summary">
        <div class="artwork">
          {p.artwork && <img src={p.artwork} alt={p.title} width={475} height={475} />}
        </div>
        <div class="summary-info">
          <p class="dex-number">{dexNumber(p.id)}</p>
          <h1>{p.title}</h1>
          <div class="team-action">
            <button
              type="button"
              class="team-toggle"
              disabled={teamFull}
              onClick$={() => {
                const next = onTeam
                  ? team.value.filter((name) => name !== p.name)
                  : normalizeTeam([...team.value, p.name]);
                team.value = next;
                saveTeamCookie(next);
              }}
            >
              {onTeam ? "Remove from team" : "Add to team"}
            </button>
            {teamFull && <span class="team-full">Team is full</span>}
          </div>
          {p.genus && <p class="genus">{p.genus}</p>}
          <p class="badges">
            {p.types.map((t) => (
              <TypeBadge key={t.name} type={t} link />
            ))}
          </p>
          <dl class="measures">
            <div>
              <dt>Height</dt>
              <dd>{p.height}</dd>
            </div>
            <div>
              <dt>Weight</dt>
              <dd>{p.weight}</dd>
            </div>
          </dl>
          {p.flavor && <p class="flavor">{p.flavor}</p>}
        </div>
      </div>

      <Section id="stats" title="Base stats">
        <table class="stats-table">
          <tbody>
            {p.stats.map((s) => (
              <tr key={s.name}>
                <th scope="row">{s.label}</th>
                <td class="stat-value">{s.value}</td>
                <td class="stat-bar-cell" aria-hidden="true">
                  <span class="stat-track">
                    <span class="stat-bar" style={{ width: `${Math.min(100, (s.value / MAX_STAT) * 100)}%` }} />
                  </span>
                </td>
              </tr>
            ))}
            <tr class="stat-total">
              <th scope="row">Total</th>
              <td class="stat-value">{p.total}</td>
              <td class="stat-bar-cell" aria-hidden="true">
                <span class="stat-track">
                  <span
                    class="stat-bar"
                    style={{ width: `${Math.min(100, (p.total / (MAX_STAT * Math.max(1, p.stats.length))) * 100)}%` }}
                  />
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </Section>

      <Section id="abilities" title="Abilities">
        <ul class="plain-list">
          {p.abilities.map((a) => (
            <li key={a.name}>
              <Link href={`/abilities/${a.name}`}>{a.label}</Link>
              {a.hidden && " (hidden)"}
            </li>
          ))}
        </ul>
      </Section>

      <Section id="evolution" title="Evolution">
        <Evolution root={p.evolution} />
      </Section>

      <Section id="moves" title="Moves">
        {p.games.length > 0 ? (
          <>
            <div class="game-picker">
              <label for="game">Game</label>
              <select
                id="game"
                onChange$={(_, el) => {
                  nav(`/pokemon/${p.name}?game=${encodeURIComponent(el.value)}`, { replaceState: true, scroll: false });
                }}
              >
                {p.games.map((g) => (
                  <option key={g.name} value={g.name} selected={g.name === p.game}>
                    {g.label}
                  </option>
                ))}
              </select>
            </div>
            {p.moveTables.map((t) => (
              <MoveTable key={`${p.game}-${t.method}`} table={t} />
            ))}
          </>
        ) : (
          <p>{orDash(null)}</p>
        )}
      </Section>
    </>
  );
});

export const head: DocumentHead = ({ resolveValue }) => {
  const p = resolveValue(usePokemon);
  return { title: pageTitle(p ? p.title : "Not found") };
};
