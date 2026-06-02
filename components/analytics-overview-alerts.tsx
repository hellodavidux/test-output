"use client"

import { useState } from "react"
import { Bell, ChevronDown, Mail, TriangleAlert, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { GroupedCombobox, type EntityGroup } from "@/components/ui/combobox/grouped-combobox"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

// ─── Mock org members (prototype only) ───────────────────────────────────────

const MOCK_ORG_MEMBERS: EntityGroup[] = [
  {
    key: "users",
    label: "Members",
    icon: User,
    entities: [
      { id: "user-1", label: "Alice Chen", description: "alice@company.com" },
      { id: "user-2", label: "Bob Martinez", description: "bob@company.com" },
      { id: "user-3", label: "Caro Williams", description: "caro@company.com" },
      { id: "user-4", label: "David Kim", description: "david@company.com" },
    ],
  },
]

// ─── Notifications section ────────────────────────────────────────────────────

type NotificationChannel = "email" | "in_app"

type SignalNotificationsConfig = {
  userIds: Array<{ groupKey: string; entityId: string }>
  channels: Record<NotificationChannel, boolean>
}

function SignalNotificationsSection() {
  const [config, setConfig] = useState<SignalNotificationsConfig>({
    userIds: [],
    channels: { email: true, in_app: true },
  })

  const toggleChannel = (channel: NotificationChannel) => {
    setConfig((prev) => ({
      ...prev,
      channels: { ...prev.channels, [channel]: !prev.channels[channel] },
    }))
  }

  return (
    <div className="px-4 py-3 space-y-3">
      <div className="flex items-center gap-1.5">
        <Bell className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Notifications</span>
      </div>

      {/* Users to notify */}
      <div className="space-y-1.5">
        <Label className="text-xs text-foreground">Users to notify</Label>
        <GroupedCombobox
          groups={MOCK_ORG_MEMBERS}
          selected={config.userIds}
          onChange={(userIds) => setConfig((prev) => ({ ...prev, userIds }))}
          placeholder="Select users"
          searchPlaceholder="Search users…"
          emptyMessage="No members found"
        />
      </div>

      {/* Channels */}
      <div className="space-y-1.5">
        <Label className="text-xs text-foreground">Notify via</Label>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-foreground/80">
              <Mail className="h-3.5 w-3.5 text-muted-foreground" />
              Email
            </div>
            <Switch
              checked={config.channels.email}
              onCheckedChange={() => toggleChannel("email")}
              className="scale-90"
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-foreground/80">
              <Bell className="h-3.5 w-3.5 text-muted-foreground" />
              In-app
            </div>
            <Switch
              checked={config.channels.in_app}
              onCheckedChange={() => toggleChannel("in_app")}
              className="scale-90"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type SignalActionKind = "evaluator" | "workflow" | "guardrail" | "review"
export type SignalAction = { label: string; kind: SignalActionKind }

export type OverviewSignalRowItem = {
  id: string
  severity: "high" | "medium"
  name: string
  description: string
  nodeId: string
  recommendation: string
  meta: string
  /** @deprecated use actions instead */
  cta: string
  runId: string
  causeNodeLabel?: string
  actions: SignalAction[]
}

export type OverviewClusterRowItem = {
  id: string
  severity: "high" | "medium"
  name: string
  description: string
  meta: string
  cta: string
  /** Short explanation of the suspected cause */
  why?: string
}

// ─── Unified panel ────────────────────────────────────────────────────────────

type UnifiedAlertsProps = {
  signals: OverviewSignalRowItem[]
  clusters: OverviewClusterRowItem[]
  signalsHighCount: number
  clustersHighCount: number
  onReviewRun: (item: OverviewSignalRowItem) => void
  onSignalAction?: (item: OverviewSignalRowItem, action: SignalAction) => void
  onOpenCluster: (clusterId: string) => void
}

export function UnifiedAlertsPanel({
  signals,
  clusters,
  onReviewRun,
  onSignalAction,
  onOpenCluster,
}: UnifiedAlertsProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-background">

      {/* ── Header — always visible, single line ── */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted/40"
      >
        {/* Signals count */}
        <span className="flex shrink-0 items-center gap-1.5 text-sm">
          <TriangleAlert className="h-3.5 w-3.5 text-yellow-500" />
          <span className="font-medium text-foreground">{signals.length} signal{signals.length !== 1 ? "s" : ""}</span>
        </span>

        <ChevronDown
          className={cn("ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform", expanded && "rotate-180")}
        />
      </button>

      {/* ── Expanded body ── */}
      {expanded && (
        <div className="border-t border-border">

          {/* Signals section */}
          <div className="border-b border-border/60">
            <div className="flex items-center bg-white px-4 pt-2.5 pb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Signals</span>
            </div>
            <div className="divide-y divide-border/50">
              {signals.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onReviewRun(item)}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors first:pt-2 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <span className={cn(
                    "h-1.5 w-1.5 shrink-0 rounded-full",
                    item.severity === "high" ? "bg-yellow-500" : "bg-amber-400"
                  )} />
                  <div className="min-w-0 flex-1 flex items-baseline gap-2">
                    <span className="shrink-0 text-sm font-medium text-foreground">{item.name}</span>
                    {item.causeNodeLabel && (
                      <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        {item.causeNodeLabel}
                      </span>
                    )}
                    <span className="truncate text-xs text-muted-foreground/60">{item.description}</span>
                  </div>
                  <span className="inline-flex h-6 shrink-0 items-center rounded-md border border-border bg-background px-2 text-xs font-medium text-muted-foreground">
                    Review run
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Notifications section */}
          <SignalNotificationsSection />

        </div>
      )}
    </div>
  )
}

// ─── Legacy stubs (keep any stray imports working) ────────────────────────────

export type RecommendationItem = {
  id: string
  priority: "high" | "medium"
  message: string
  why: string
  actionLabel: string
  actionKind: SignalActionKind
  sourceId?: string
}

export function OverviewSignalsPanel(_: unknown) { return null }
export function OverviewClustersPanel(_: unknown) { return null }
