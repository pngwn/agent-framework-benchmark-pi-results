import { humanize } from '../data';
import { TEAM_SIZE, type CoverageRow, type TeamMember } from '../team';
import { CardList, Section } from './components';

export const TeamButton = ({ species, team }: { species: string; team: string[] }) => {
  const inTeam = team.includes(species);
  const full = team.length >= TEAM_SIZE;
  return (
    <div class="team-actions">
      {inTeam ? (
        <form method="post" action="/team/remove">
          <input type="hidden" name="name" value={species} />
          <input type="hidden" name="next" value={`/pokemon/${species}`} />
          <button class="button" type="submit">
            Remove from team
          </button>
        </form>
      ) : (
        <form method="post" action="/team/add">
          <input type="hidden" name="name" value={species} />
          <button class="button" type="submit" disabled={full}>
            Add to team
          </button>
        </form>
      )}
      {!inTeam && full && <span class="team-full">Team is full</span>}
    </div>
  );
};

const CoverageTable = ({ rows }: { rows: CoverageRow[] }) => (
  <div class="table-scroll">
    <table class="coverage-table">
      <thead>
        <tr>
          <th scope="col">Type</th>
          <th scope="col">Weak</th>
          <th scope="col">Resistant</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr>
            <th scope="row">{row.label}</th>
            <td>{row.weak}</td>
            <td>{row.resistant}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export const TeamPage = ({ members, coverage }: { members: TeamMember[]; coverage: CoverageRow[] }) => (
  <>
    <h1>Team</h1>
    <p class="count">
      {members.length} of {TEAM_SIZE}
    </p>
    {members.length === 0 ? (
      <p>
        Your team is empty. <a href="/">Browse the Pokédex</a>
      </p>
    ) : (
      <>
        <CardList
          cards={members}
          action={(card) => (
            <form method="post" action="/team/remove">
              <input type="hidden" name="name" value={card.name} />
              <input type="hidden" name="next" value="/team" />
              <button class="button button-small" type="submit">
                Remove {humanize(card.name)}
              </button>
            </form>
          )}
        />
        <Section id="coverage" title="Type coverage">
          <CoverageTable rows={coverage} />
        </Section>
      </>
    )}
  </>
);
