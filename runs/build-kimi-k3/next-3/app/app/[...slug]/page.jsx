import { NotFound } from '../../lib/components.jsx';

export const dynamic = 'force-dynamic';

export function generateMetadata() {
  return { title: 'Not found' };
}

export default function CatchAllPage() {
  return <NotFound />;
}
