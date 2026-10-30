import { humanize } from '../data';
import { TEAM_MAX, type TeamData } from '../team';
import { CardList, Section } from './components';

const RemoveButton = ({ name }: { name: string }) => (
  <form
    class="card-remove-form"
    method="post"
    action="/team/remove"
    hx-post="/team/remove"
    hx-target="#team-content"
    hx-swap="outerHTML"
  >
    <input type="hidden" name="name" value={name} />
    <button type="submit" class="card-remove">
      Remove {humanize(name)}
    </button>
  </form>
);

export const TeamContent = ({ data }: { data: TeamData }) => {
  const count = data.cards.length;
  return (
    <div id="team-content">
      <p class="count">
        {count} of {TEAM_MAX}
      </p>
      {count === 0 ? (
        <p class="empty-team">
          Your team is empty. <a href="/">Browse Pokémon</a>
        </p>
      ) : (
        <>
          <CardList cards={data.cards} action={(card) => <RemoveButton name={card.name} />} />
          <Section id="coverage" title="Type coverage">
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
                  {data.coverage.map((row) => (
                    <tr>
                      <th scope="row">{row.label}</th>
                      <td>{row.weak}</td>
                      <td>{row.resistant}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        </>
      )}
    </div>
  );
};

export const TeamPage = ({ data }: { data: TeamData }) => (
  <>
    <h1>Team</h1>
    <TeamContent data={data} />
  </>
);
