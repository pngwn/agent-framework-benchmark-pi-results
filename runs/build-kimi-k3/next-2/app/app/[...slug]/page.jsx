import { NotFound } from '../components/NotFound.jsx';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Not found',
};

export default function CatchAllPage() {
  return <NotFound />;
}
