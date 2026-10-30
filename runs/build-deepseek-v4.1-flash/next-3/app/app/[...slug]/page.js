import NotFound from '../../components/NotFound';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Not found – Pokédex',
};

export default function CatchAllPage() {
  return <NotFound />;
}
