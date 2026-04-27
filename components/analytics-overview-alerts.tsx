"use client"

import { useState } from "react"
import { ChevronDown, Layers, TriangleAlert } from "lucide-react"
import { cn } from "@/lib/utils"

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
  signalsHighCount,
  clustersHighCount,
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
          {signalsHighCount > 0 && (
            <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-600">
              {signalsHighCount} high
            </span>
          )}
        </span>

        <span className="text-border shrink-0">·</span>

        {/* Clusters count */}
        <span className="flex shrink-0 items-center gap-1.5 text-sm">
          <Layers className="h-3.5 w-3.5 text-amber-500" />
          <span className="font-medium text-foreground">{clusters.length} cluster{clusters.length !== 1 ? "s" : ""}</span>
          {clustersHighCount > 0 && (
            <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-600">
              {clustersHighCount} high
            </span>
          )}
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
                    item.severity === "high" ? "bg-red-500" : "bg-amber-400"
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

          {/* Clusters section — each row is both a pattern summary and a recommendation */}
          <div>
            <div className="flex items-center bg-white px-4 pt-2.5 pb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Clusters</span>
            </div>
            <div className="divide-y divide-border/50">
              {clusters.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onOpenCluster(item.id)}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors first:pt-2 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    <span className={cn(
                      "h-1.5 w-1.5 shrink-0 rounded-full",
                      item.severity === "high" ? "bg-red-500" : "bg-amber-400"
                    )} />
                    {/* Name + why — same line */}
                    <div className="min-w-0 flex-1 flex items-baseline gap-2">
                      <span className="shrink-0 text-sm font-medium text-foreground">{item.name}</span>
                      {item.why && (
                        <span className="truncate text-xs text-muted-foreground/60">{item.why}</span>
                      )}
                    </div>
                    {/* Meta */}
                    <span className="shrink-0 font-mono text-[11px] text-muted-foreground/50">{item.meta}</span>
                    <span className="inline-flex h-6 shrink-0 items-center rounded-md border border-border bg-background px-2 text-xs font-medium text-muted-foreground">
                      {item.cta}
                    </span>
                  </button>
                ))}
            </div>
          </div>

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
