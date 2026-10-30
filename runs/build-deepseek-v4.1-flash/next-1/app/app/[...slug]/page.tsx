import type { Metadata } from 'next';
import NotFoundContent from '@/components/NotFoundContent';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Not found',
};

export default function CatchAllPage() {
  return <NotFoundContent />;
}
