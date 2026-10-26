import { EvaluationView } from '@/components/InvestEvaluation';
export default async function Review({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <EvaluationView id={id} />; }
