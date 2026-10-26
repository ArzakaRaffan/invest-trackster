import { InvestMarket } from '@/components/InvestMarket';
export default async function Instrument({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <InvestMarket instrumentId={id} />; }
