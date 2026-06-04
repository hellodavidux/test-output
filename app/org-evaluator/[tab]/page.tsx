import { redirect } from "next/navigation"
import { OuterLayout } from "@/components/outer-layout"
import { OrgEvaluator } from "@/components/org-evaluator"

const VALID_TABS = ["evals", "signals", "runs"] as const
type TabSlug = (typeof VALID_TABS)[number]

export default async function OrgEvaluatorTabPage({ params }: { params: Promise<{ tab: string }> }) {
  const { tab } = await params
  if (!VALID_TABS.includes(tab as TabSlug)) {
    redirect("/org-evaluator/evals")
  }
  return (
    <OuterLayout activeNavKey="org-evaluator">
      <OrgEvaluator defaultTab={tab as TabSlug} />
    </OuterLayout>
  )
}
