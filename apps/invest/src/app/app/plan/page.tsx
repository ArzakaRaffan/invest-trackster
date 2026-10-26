import { MonthlyBudget } from '@/components/MonthlyBudget';
import { PlanProfile } from '@/components/GoalsAndRisk';
import { EvaluationPanel } from '@/components/InvestEvaluation';
export default function Plan() { return <><PlanProfile /><EvaluationPanel /><MonthlyBudget plan /></>; }
