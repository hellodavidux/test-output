"use client"

import { useState } from "react"
import { ChevronDown, Layers, TriangleAlert } from "lucide-react"
import { cn } from "@/lib/utils"

export type OverviewSignalRowItem = {
  id: string
  severity: "high" | "medium"
  name: string
  description: string
  nodeId: string
  recommendation: string
  meta: string
  cta: string
  runId: string
}

export type OverviewClusterRowItem = {
  id: string
  severity: "high" | "medium"
  name: string
  description: string
  meta: string
  cta: string
}

const rowClass =
  "flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted/30"
const ctaClass =
  "inline-flex h-6 shrink-0 items-center justify-center rounded-md border border-input bg-background px-2 text-xs font-medium text-foreground"

type OverviewSignalsPanelProps = {
  items: OverviewSignalRowItem[]
  highSeverityCount: number
  onReviewRun: (item: OverviewSignalRowItem) => void
}

export function OverviewSignalsPanel({ items, highSeverityCount, onReviewRun }: OverviewSignalsPanelProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-background">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left hover:bg-muted/40 transition-colors"
      >
        <TriangleAlert className="h-3.5 w-3.5 shrink-0 text-yellow-500" aria-hidden />
        <span className="text-sm font-medium">Signals</span>
        <span className="text-sm text-muted-foreground">— {highSeverityCount} high severity</span>
        <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
          View all
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-180")} />
        </span>
      </button>

      {expanded && (
        <div className="border-t border-border divide-y divide-border">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              className={cn(rowClass, "cursor-pointer")}
              onClick={() => onReviewRun(item)}
            >
              <span className="text-sm font-medium text-foreground shrink-0">{item.name}</span>
              <span className="text-xs text-muted-foreground/60 truncate min-w-0 flex-1">{item.description}</span>
              <span className="text-[11px] text-muted-foreground/50 shrink-0 font-mono">{item.meta}</span>
              <span className={ctaClass}>{item.cta}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

type OverviewClustersPanelProps = {
  items: OverviewClusterRowItem[]
  highSeverityCount: number
  onOpenCluster: (clusterId: string) => void
}

export function OverviewClustersPanel({ items, highSeverityCount, onOpenCluster }: OverviewClustersPanelProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-background">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left hover:bg-muted/40 transition-colors"
      >
        <Layers className="h-3.5 w-3.5 shrink-0 text-amber-600" />
        <span className="text-sm font-medium">Clusters</span>
        <span className="text-sm text-muted-foreground">— {highSeverityCount} high severity</span>
        <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
          View all
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-180")} />
        </span>
      </button>

      {expanded && (
        <div className="border-t border-border divide-y divide-border">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              className={cn(rowClass, "cursor-pointer")}
              onClick={() => onOpenCluster(item.id)}
            >
              <span className="text-sm font-medium text-foreground shrink-0">{item.name}</span>
              <span className="text-xs text-muted-foreground/60 truncate min-w-0 flex-1">{item.description}</span>
              <span className="text-[11px] text-muted-foreground/50 shrink-0 font-mono">{item.meta}</span>
              <span className={ctaClass}>{item.cta}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
