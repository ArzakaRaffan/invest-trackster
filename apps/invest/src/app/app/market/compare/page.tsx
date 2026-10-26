import { InstrumentComparison } from '@/components/InstrumentDetails';
export default async function Compare({ searchParams }: { searchParams: Promise<{ ids?: string | string[] }> }) { const { ids } = await searchParams; return <InstrumentComparison ids={typeof ids === 'string' ? ids : ''} />; }
