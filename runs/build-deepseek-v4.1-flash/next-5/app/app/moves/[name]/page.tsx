import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PokemonCard } from '../../components/PokemonCard';
import { getMovePageData, getMoveRecord, isNotFound } from '../../lib/data';
import { englishName, formatNumber, NameInfo } from '../../lib/models';

export const dynamic = 'force-dynamic';

interface MovePageProps {
  params: Promise<{ name: string }>;
}

export async function generateMetadata({ params }: MovePageProps): Promise<Metadata> {
  const { name } = await params;
  const record = await getMoveRecord(name);
  return { title: record ? englishName(record.names as NameInfo[], record.name) : 'Not found' };
}

export default async function MovePage({ params }: MovePageProps) {
  const { name } = await params;
  const data = await getMovePageData(name);

  if (isNotFound(data)) notFound();

  return (
    <main className="shell page">
      <h1>{data.englishName}</h1>

      <div className="panel">
        <dl className="move-facts">
          <div>
            <dt>Type</dt>
            <dd>
              <Link href={`/types/${data.type.name}`} className={`type-badge type-${data.type.name}`}>
                {data.type.label}
              </Link>
            </dd>
          </div>
          <div>
            <dt>Category</dt>
            <dd>{data.category}</dd>
          </div>
          <div>
            <dt>Power</dt>
            <dd>{formatNumber(data.record.power)}</dd>
          </div>
          <div>
            <dt>Accuracy</dt>
            <dd>{formatNumber(data.record.accuracy)}</dd>
          </div>
          <div>
            <dt>PP</dt>
            <dd>{formatNumber(data.record.pp)}</dd>
          </div>
        </dl>
      </div>

      <section className="panel" aria-labelledby="effect-heading">
        <h2 id="effect-heading">Effect</h2>
        <p>{data.effect}</p>
      </section>

      <section className="panel" aria-labelledby="learned-by-heading">
        <h2 id="learned-by-heading">Learned by</h2>
        <p className="count">{data.learnedBy.length} Pokémon</p>
        <ul className="card-grid">
          {data.learnedBy.map((card) => (
            <PokemonCard key={card.id} card={card} />
          ))}
        </ul>
      </section>
    </main>
  );
}
