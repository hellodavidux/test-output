import { OuterLayout } from "@/components/outer-layout"
import { OrgAnalytics } from "@/components/org-analytics"

export default function AnalyticsPage() {
  return (
    <OuterLayout activeNavKey="analytics">
      <OrgAnalytics />
    </OuterLayout>
  )
}
