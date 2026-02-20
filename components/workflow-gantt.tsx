"use client"

import React, { useState, useMemo } from "react"
import { ChevronDown, ChevronRight, Play, Zap, FileText, Mail, CheckSquare, Send, Folder, Route, GitBranch, Check, X, Loader2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

export interface GanttNode {
  id: string
  label: string
  startSec: number
  endSec: number
  depth: number
  hasChildren: boolean
  icon?: "play" | "zap" | "file" | "mail" | "check" | "send" | "folder" | "route" | "branch"
  status?: "error" | "success"
}

export const GANTT_NODES: GanttNode[] = [
  { id: "1", label: "User Input", startSec: 0, endSec: 1.2, depth: 0, hasChildren: false, icon: "play" },
  { id: "2a", label: "AI Agent", startSec: 6.5, endSec: 14, depth: 0, hasChildren: false, icon: "zap" },
  { id: "2", label: "AI Agent", startSec: 1.2, endSec: 8, depth: 0, hasChildren: false, icon: "zap" },
  { id: "3", label: "AI Routing", startSec: 12, endSec: 13.5, depth: 0, hasChildren: false, icon: "route" },
  { id: "4", label: "AI Agent", startSec: 2, endSec: 17, depth: 0, hasChildren: false, icon: "zap" },
  { id: "5", label: "Send Email", startSec: 13.5, endSec: 15, depth: 0, hasChildren: false, icon: "mail", status: "error" },
  { id: "6", label: "If/Else", startSec: 15, endSec: 16, depth: 0, hasChildren: false, icon: "branch" },
  { id: "7", label: "Notion", startSec: 15.5, endSec: 17, depth: 0, hasChildren: false, icon: "file" },
  { id: "9", label: "Project node", startSec: 0, endSec: 6, depth: 0, hasChildren: true, icon: "folder" },
  { id: "9-1", label: "input", startSec: 0, endSec: 1.5, depth: 1, hasChildren: false, icon: "play" },
  { id: "9-2", label: "AI Agent", startSec: 1.5, endSec: 4, depth: 1, hasChildren: false, icon: "zap" },
  { id: "9-3", label: "Send Email", startSec: 4, endSec: 5.5, depth: 1, hasChildren: false, icon: "mail" },
  { id: "8", label: "Output", startSec: 17, endSec: 20, depth: 0, hasChildren: false, icon: "send" },
]

const MOCK_NODES = GANTT_NODES

/** Deterministic hash from string for seeding. */
function hash(s: string): number {
  return Math.abs(s.split("").reduce((a, c) => (a << 5) - a + c.charCodeAt(0), 0) | 0)
}

/** Returns a copy of nodes with startSec/endSec varied by runId so each run shows different Gantt timings. */
export function varyGanttNodesByRunId(runId: string, nodes: GanttNode[]): GanttNode[] {
  if (!runId) return nodes
  const seed = hash(runId)
  return nodes.map((node, i) => {
    const h = hash(`${runId}-${node.id}-${i}-${seed}`)
    const startDelta = ((h % 7) - 3) * 0.5
    const durDelta = (((h >> 3) % 5) - 2) * 0.6
    const newStartSec = Math.max(0, node.startSec + startDelta)
    const duration = node.endSec - node.startSec
    const newEndSec = Math.max(newStartSec + 0.3, Math.min(20, newStartSec + Math.max(0.3, duration + durDelta)))
    return { ...node, startSec: newStartSec, endSec: newEndSec }
  })
}

export const FIRST_GANTT_NODE: GanttNode = MOCK_NODES[1] // AI Agent - default when opening run detail

const ROW_HEIGHT = 36
const LEFT_WIDTH = 280
const SECONDS_MAX = 20
const TIME_HEADER_HEIGHT = 32

const COMPACT_ROW_HEIGHT = 32
const COMPACT_LEFT_WIDTH = 150
const COMPACT_TIME_HEADER_HEIGHT = 18
const COMPACT_PX_PER_SEC = 20

function isActionType(n: GanttNode): boolean {
  const label = n.label.toLowerCase()
  return (
    !label.includes("user input") &&
    n.icon !== "play" &&
    label !== "output" &&
    n.icon !== "send" &&
    label !== "ai agent" &&
    n.icon !== "zap" &&
    label !== "ai routing" &&
    n.icon !== "route" &&
    !label.includes("if") &&
    !label.includes("else") &&
    n.icon !== "branch" &&
    !label.includes("loop") &&
    !n.hasChildren &&
    n.icon !== "folder" &&
    !label.includes("delay")
  )
}

/** Label like llm-0, action-0, routing, in-0, out-0 for the node row. Exported for sidebar header. */
export function getNodeIdentifier(node: GanttNode, visibleNodes: GanttNode[]): string {
  const label = node.label.toLowerCase()
  const idx = visibleNodes.findIndex((n) => n.id === node.id)
  const sameLabelCount = visibleNodes.slice(0, idx + 1).filter((n) => n.label === node.label).length - 1
  const actionCount = visibleNodes.slice(0, idx + 1).filter(isActionType).length - 1
  if (label.includes("user input") || node.icon === "play") return "in-0"
  if (label === "output" || node.icon === "send") return `out-${sameLabelCount}`
  if (label === "ai agent" || node.icon === "zap") return `llm-${sameLabelCount}`
  if (label === "ai routing" || node.icon === "route") return "routing"
  if (label.includes("if") || label.includes("else") || node.icon === "branch") return `ifelse-${sameLabelCount}`
  if (label.includes("loop") || node.hasChildren || node.icon === "folder") return `loop_subflow-${sameLabelCount}`
  if (label.includes("delay")) return `delay-${sameLabelCount}`
  return `action-${Math.max(0, actionCount)}`
}

export function GanttNodeIcon({ type }: { type?: GanttNode["icon"] }) {
  switch (type) {
    case "play":
      return <Play className="h-3.5 w-3.5 text-muted-foreground" />
    case "zap":
      return <Zap className="h-3.5 w-3.5 text-muted-foreground" />
    case "file":
      return <FileText className="h-3.5 w-3.5 text-muted-foreground" />
    case "mail":
      return <Mail className="h-3.5 w-3.5 text-muted-foreground" />
    case "check":
      return <CheckSquare className="h-3.5 w-3.5 text-muted-foreground" />
    case "send":
      return <Send className="h-3.5 w-3.5 text-muted-foreground" />
    case "folder":
      return <Folder className="h-3.5 w-3.5 text-muted-foreground" />
    case "route":
      return <Route className="h-3.5 w-3.5 text-muted-foreground" />
    case "branch":
      return <GitBranch className="h-3.5 w-3.5 text-muted-foreground" />
    default:
      return <div className="h-3.5 w-3.5 rounded-sm bg-muted-foreground/30" />
  }
}

const RUN_ANIMATION_DURATION_MS = 5000

interface WorkflowGanttProps {
  selectedNodeId?: string | null
  onNodeSelect?: (node: GanttNode | null) => void
  compact?: boolean
  isRunning?: boolean
  runStartTime?: number | null
  /** When provided, use these nodes instead of default (e.g. per-run varied data). */
  nodes?: GanttNode[]
  /** When set, the Gantt row for this node id is highlighted (e.g. when hovering a context link in sidebar). */
  highlightNodeId?: string | null
}

export function WorkflowGantt({ selectedNodeId = null, onNodeSelect, compact = false, isRunning = false, runStartTime = null, nodes: nodesProp, highlightNodeId = null }: WorkflowGanttProps) {
  const sourceNodes = nodesProp ?? MOCK_NODES
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set(["9"]))
  const [now, setNow] = useState(() => Date.now())
  const compactScrollRef = React.useRef<HTMLDivElement>(null)

  // Compact Gantt: wheel scrolls horizontally (non-passive so preventDefault works)
  React.useEffect(() => {
    const el = compactScrollRef.current
    if (!el || !compact) return
    const onWheel = (e: WheelEvent) => {
      if (e.deltaY === 0) return
      e.preventDefault()
      el.scrollLeft += e.deltaY
    }
    el.addEventListener("wheel", onWheel, { passive: false })
    return () => el.removeEventListener("wheel", onWheel)
  }, [compact])

  // When compact + running, advance simulated time so nodes turn success/error sequentially
  React.useEffect(() => {
    if (!compact || !isRunning || runStartTime == null) return
    const interval = setInterval(() => {
      setNow(Date.now())
    }, 80)
    return () => clearInterval(interval)
  }, [compact, isRunning, runStartTime])

  const { visibleNodes, maxSec } = useMemo(() => {
    let maxSec = 0
    const visible: GanttNode[] = []
    let hideDepth = -1

    for (const node of sourceNodes) {
      if (hideDepth >= 0 && node.depth > hideDepth) {
        continue
      }
      if (hideDepth >= 0 && node.depth <= hideDepth) {
        hideDepth = -1
      }
      if (collapsed.has(node.id) && node.hasChildren) {
        hideDepth = node.depth
      }
      // Skip nodes with no label so we don't render an empty row
      const label = typeof node.label === "string" ? node.label : String(node.label ?? "")
      if (!label.trim()) continue
      visible.push(node)
      if (node.endSec > maxSec) maxSec = node.endSec
    }
    return { visibleNodes: visible, maxSec: Math.min(Math.max(maxSec + 2, SECONDS_MAX), SECONDS_MAX) }
  }, [collapsed, sourceNodes])

  // End time of the latest error node (by endSec). Nodes that start after this are incomplete.
  const errorEndSec = useMemo(() => {
    const errorNodes = visibleNodes.filter((n) => n.status === "error")
    return errorNodes.length > 0 ? Math.max(...errorNodes.map((n) => n.endSec)) : -1
  }, [visibleNodes])

  const simulatedSec = useMemo(() => {
    if (!compact || !isRunning || runStartTime == null) return null
    const elapsed = (now - runStartTime) / 1000
    const progress = Math.min(1, elapsed / (RUN_ANIMATION_DURATION_MS / 1000))
    return progress * maxSec
  }, [compact, isRunning, runStartTime, now, maxSec])

  const toggle = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const barAreaWidth = compact ? COMPACT_PX_PER_SEC * maxSec : undefined

  // Ease-in-out cubic for scroll: slow at start/end, faster in the middle
  const easeInOutCubic = (t: number) =>
    t <= 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

  // When compact + running, auto-scroll the Gantt so the advancing timeline stays in view (eased)
  React.useEffect(() => {
    if (!compact || simulatedSec == null || barAreaWidth == null) return
    const el = compactScrollRef.current
    if (!el) return
    const linearProgress = simulatedSec / maxSec
    const easedProgress = easeInOutCubic(linearProgress)
    const targetScroll = easedProgress * barAreaWidth - el.clientWidth * 0.4
    el.scrollLeft = Math.max(0, Math.min(targetScroll, el.scrollWidth - el.clientWidth))
  }, [compact, simulatedSec, maxSec, barAreaWidth])

  if (compact) {
    const scrollbarHide = "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
    return (
      <TooltipProvider delayDuration={200}>
        <div className="flex flex-col min-h-0 overflow-y-auto rounded border border-border/40 bg-card">
          <div className="flex flex-row flex-shrink-0">
            {/* Left column: sticky labels (no horizontal scroll) */}
            <div
              className="flex flex-col flex-shrink-0 border-r border-border/40 bg-card"
              style={{ width: COMPACT_LEFT_WIDTH }}
            >
              {/* Node label cells */}
              {visibleNodes.map((node) => {
                if (!(typeof node.label === "string" ? node.label : String(node.label ?? "")).trim()) return null
                const isIncomplete = errorEndSec >= 0 && node.startSec > errorEndSec
                const isSelected = selectedNodeId === node.id
                const isNodeRunning = simulatedSec != null && simulatedSec >= node.startSec && simulatedSec < node.endSec
                const isNodeFinished = simulatedSec != null && simulatedSec >= node.endSec
                const baseStatus = simulatedSec == null
                  ? (node.status ?? "success")
                  : isNodeFinished
                    ? (node.status ?? "success")
                    : "running"
                const displayStatus = node.status === "error" ? "error" : isIncomplete ? "skipped" : baseStatus
                return (
                  <div
                    key={node.id}
                    className="group flex flex-shrink-0 items-center border-b border-border/20 last:border-b-0 bg-muted/20 px-2 py-1.5 cursor-pointer hover:bg-muted/30 overflow-hidden"
                    style={{ height: COMPACT_ROW_HEIGHT }}
                    role="button"
                    tabIndex={0}
                    onClick={() => onNodeSelect?.(node)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        onNodeSelect?.(node)
                      }
                    }}
                  >
                    <span
                      className={cn(
                        "flex items-center gap-1.5 rounded py-0.5 px-1 min-w-0 flex-1 hover:bg-muted/30 text-xs truncate",
                        isSelected && "bg-muted"
                      )}
                    >
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-muted/60 border border-border/50">
                        <GanttNodeIcon type={node.icon} />
                      </span>
                      <span className="truncate text-foreground flex-1 min-w-0">{node.label}</span>
                      <span
                        className={cn(
                          "flex h-2.5 w-2.5 shrink-0 items-center justify-center rounded-full",
                          displayStatus === "error" && "bg-red-500",
                          displayStatus === "success" && "bg-green-500",
                          displayStatus === "running" && "bg-purple-500",
                          displayStatus === "skipped" && "bg-muted-foreground/30"
                        )}
                        aria-label={displayStatus === "skipped" ? "Incomplete" : displayStatus === "error" ? "Failed" : displayStatus === "success" ? "Success" : "Running"}
                      >
                        {displayStatus === "error" ? (
                          <X className="h-2 w-2 text-white stroke-[3]" />
                        ) : displayStatus === "running" ? (
                          <Loader2 className="h-2 w-2 text-white animate-spin stroke-[2.5]" />
                        ) : displayStatus === "success" ? (
                          <Check className="h-2 w-2 text-white stroke-[3]" />
                        ) : null}
                      </span>
                    </span>
                  </div>
                )
              })}
            </div>
            {/* Right column: scrollable Gantt bars only */}
            <div
              ref={compactScrollRef}
              className={cn("flex-1 min-w-0 overflow-x-auto overflow-y-hidden flex flex-col", scrollbarHide)}
              style={{ minWidth: 0 }}
            >
              <div className="flex flex-col flex-shrink-0" style={{ minWidth: barAreaWidth }}>
                {/* Bar rows */}
                {visibleNodes.map((node) => {
                  if (!(typeof node.label === "string" ? node.label : String(node.label ?? "")).trim()) return null
                  const isSelected = selectedNodeId === node.id
                  const isNodeRunning = simulatedSec != null && simulatedSec >= node.startSec && simulatedSec < node.endSec
                  const isNodeFinished = simulatedSec != null && simulatedSec >= node.endSec
                  const displayStatus = simulatedSec == null
                    ? (node.status ?? "success")
                    : isNodeFinished
                      ? (node.status ?? "success")
                      : "running"
                  // When running: bar grows from start until done; we don't show known duration upfront
                  const leftPx = (node.startSec / maxSec) * (barAreaWidth ?? 0)
                  let barWidthPx: number
                  if (simulatedSec == null) {
                    // Not running: show short "done" pill per node
                    barWidthPx = 32
                  } else if (simulatedSec < node.startSec) {
                    barWidthPx = 0
                  } else if (isNodeRunning) {
                    barWidthPx = (simulatedSec - node.startSec) * COMPACT_PX_PER_SEC
                  } else {
                    barWidthPx = (node.endSec - node.startSec) * COMPACT_PX_PER_SEC
                  }
                  const barWidthPxClamped = Math.max(barWidthPx, barWidthPx > 0 ? 6 : 0)
                  return (
                    <div
                      key={node.id}
                      className="group relative flex flex-shrink-0 items-center cursor-pointer hover:bg-muted/20 border-b border-border/20 last:border-b-0 overflow-hidden pl-1 pr-1"
                      style={{ height: COMPACT_ROW_HEIGHT, minWidth: barAreaWidth }}
                      role="button"
                      tabIndex={0}
                      onClick={() => onNodeSelect?.(node)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault()
                          onNodeSelect?.(node)
                        }
                      }}
                    >
                      <Tooltip delayDuration={200}>
                        <TooltipTrigger asChild>
                          <div
                            className={cn(
                              "absolute rounded-sm border flex-shrink-0 min-w-[2px] transition-[width] duration-150 flex items-center justify-start pl-1 pr-0.5 overflow-hidden cursor-default ml-2",
                              "top-1/2 -translate-y-1/2",
                              displayStatus === "error" && "bg-destructive/20 border-destructive/40",
                              displayStatus === "success" && (isSelected ? "bg-primary border-primary" : "bg-muted border-border"),
                              displayStatus === "running" && "bg-purple-500/30 border-purple-500/50",
                              displayStatus === "skipped" && "bg-muted-foreground/20 border-muted-foreground/30"
                            )}
                            style={{
                              left: leftPx,
                              width: barWidthPxClamped,
                              height: 14,
                            }}
                          >
                            {displayStatus === "running" && barWidthPxClamped >= 20 && (
                              <span className="text-[9px] font-medium text-purple-700 dark:text-purple-300 whitespace-nowrap">
                                …
                              </span>
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" sideOffset={4} className="text-xs bg-white dark:bg-card border border-border shadow-md" hideArrow>
                          <span className="font-medium">{node.label}</span>
                          {displayStatus === "skipped" && (
                            <span className="text-muted-foreground"> · Incomplete (run failed earlier)</span>
                          )}
                          {simulatedSec == null && displayStatus !== "skipped" && (
                            <span className="text-muted-foreground"> · Done · {(node.endSec - node.startSec).toFixed(1)}s</span>
                          )}
                          {simulatedSec != null && isNodeRunning && (
                            <span className="text-muted-foreground"> · Running…</span>
                          )}
                          {simulatedSec != null && isNodeFinished && displayStatus !== "skipped" && (
                            <span className="text-muted-foreground"> · Done · {(node.endSec - node.startSec).toFixed(1)}s</span>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </TooltipProvider>
    )
  }

  return (
    <TooltipProvider delayDuration={200}>
    <Card
      className="rounded-lg bg-card border shadow-sm overflow-hidden flex flex-col flex-1 min-h-0 p-0 pb-3 gap-0"
      onClick={() => onNodeSelect?.(null)}
    >
      <CardContent className="p-0 flex flex-1 flex-col min-h-0">
        <div className="flex flex-1 min-h-0 flex-col min-w-0">
          {/* Time axis row: aligns with node rows below */}
          <div className="flex flex-shrink-0" style={{ height: TIME_HEADER_HEIGHT }}>
            <div
              className="flex-shrink-0 bg-muted/30 flex items-center gap-2 border-r border-border/40"
              style={{ width: LEFT_WIDTH, paddingLeft: 0 }}
            >
              <span className="w-4 flex-shrink-0" aria-hidden />
            </div>
            <div className="flex-1 min-w-0 flex items-end pr-8">
              {Array.from({ length: Math.ceil(maxSec) + 1 }, (_, i) => i).map((sec) => (
                <div
                  key={sec}
                  className="flex flex-1 min-w-0 flex-col items-center pb-0.5"
                >
                  {sec % 2 === 0 ? (
                    <>
                      <span className="text-[10px] text-muted-foreground tabular-nums text-center">
                        {sec}s
                      </span>
                      <div className="w-px h-1.5 shrink-0 bg-border/60 rounded-full mt-0.5" aria-hidden />
                    </>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          {/* Body: one row per node so list and bar stay aligned */}
          <ScrollArea className="flex-1 min-h-0">
            <div className="flex flex-col min-w-0">
              {visibleNodes.map((node, index) => {
                const isIncomplete = errorEndSec >= 0 && node.startSec > errorEndSec
                const effectiveStatus = node.status === "error" ? "error" : isIncomplete ? "skipped" : (node.status ?? "success")
                const isSelected = selectedNodeId === node.id
                const isHighlighted = highlightNodeId === node.id
                const leftPct = (node.startSec / maxSec) * 100
                const widthPct = Math.max((node.endSec - node.startSec) / maxSec * 100, 1)
                return (
                  <div
                    key={node.id}
                    className={cn(
                      "group flex items-center flex-shrink-0 cursor-pointer hover:bg-muted/30 border-b border-border/30 pr-8",
                      index === 0 && "border-t border-border/30",
                      isSelected && "bg-muted/30 shadow-[inset_2px_0_0_0_hsl(var(--primary))]",
                      isHighlighted && "bg-primary/5 hover:bg-primary/5"
                    )}
                    style={{ minHeight: ROW_HEIGHT }}
                    role="button"
                    tabIndex={0}
                    onClick={() => onNodeSelect?.(isSelected ? null : node)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        onNodeSelect?.(isSelected ? null : node)
                      }
                    }}
                  >
                    {/* Left: task label */}
                    <div
                      className="flex items-center gap-0 h-9 text-sm flex-shrink-0 bg-muted/20 border-r border-border/40 overflow-hidden"
                      style={{ width: LEFT_WIDTH, paddingLeft: node.depth * 16 }}
                    >
                      {node.hasChildren ? (
                        <button
                          type="button"
                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded hover:bg-muted"
                          onClick={(e) => {
                            e.stopPropagation()
                            toggle(node.id)
                          }}
                          aria-label={collapsed.has(node.id) ? "Expand" : "Collapse"}
                        >
                          {collapsed.has(node.id) ? (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </button>
                      ) : (
                        <span className="w-6 shrink-0" aria-hidden />
                      )}
                      <span
                        role="button"
                        tabIndex={0}
                        className="flex items-center gap-1.5 rounded-md py-0.5 pl-0.5 pr-3 min-w-0 flex-1"
                        onClick={(e) => {
                          e.stopPropagation()
                          onNodeSelect?.(node)
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault()
                            e.stopPropagation()
                            onNodeSelect?.(node)
                          }
                        }}
                      >
                        {node.hasChildren ? (
                          <button
                            type="button"
                            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted/60 border border-border/50 hover:bg-muted cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation()
                              toggle(node.id)
                            }}
                            aria-label={collapsed.has(node.id) ? "Expand" : "Collapse"}
                          >
                            <GanttNodeIcon type={node.icon} />
                          </button>
                        ) : (
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted/60 border border-border/50">
                            <GanttNodeIcon type={node.icon} />
                          </span>
                        )}
                        <span className="truncate text-foreground flex-1 min-w-0">
                          {node.label}
                        </span>
                        <span
                          className={cn(
                            "flex h-2.5 w-2.5 shrink-0 items-center justify-center rounded-full",
                            effectiveStatus === "error" && "bg-red-500",
                            effectiveStatus === "success" && "bg-green-500",
                            effectiveStatus === "skipped" && "bg-muted-foreground/30"
                          )}
                          aria-label={effectiveStatus === "error" ? "Failed" : effectiveStatus === "success" ? "Success" : "Skipped"}
                        >
                          {effectiveStatus === "error" ? (
                            <X className="h-1.5 w-1.5 text-white stroke-[3]" />
                          ) : effectiveStatus === "success" ? (
                            <Check className="h-1.5 w-1.5 text-white stroke-[3]" />
                          ) : null}
                        </span>
                      </span>
                    </div>
                    {/* Right: Gantt bar - full width of remaining space */}
                    <div
                      className="flex-1 min-w-0 relative h-9 flex items-center pl-8 pr-8"
                      onClick={(e) => {
                        e.stopPropagation()
                        onNodeSelect?.(node)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault()
                          onNodeSelect?.(node)
                        }
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      <Tooltip delayDuration={200}>
                        <TooltipTrigger asChild>
                          <div
                            className={cn(
                              "absolute h-5 rounded-sm border flex-shrink-0 min-w-[2px] transition-colors flex items-center justify-start pl-1.5 pr-1 overflow-hidden cursor-default ml-2",
                              effectiveStatus === "error"
                                ? isSelected
                                  ? "bg-destructive/25 border-destructive/50 group-hover:bg-destructive/35"
                                  : "bg-destructive/20 border-destructive/40 group-hover:bg-destructive/30"
                                : effectiveStatus === "skipped"
                                  ? "bg-muted-foreground/20 border-muted-foreground/30"
                                  : isSelected
                                    ? "bg-primary border-primary group-hover:bg-primary/90"
                                    : "bg-muted border-border group-hover:bg-muted-foreground/20"
                            )}
                            style={{
                              left: `${leftPct}%`,
                              width: `${widthPct}%`,
                            }}
                          >
                            {widthPct >= 3 && (
                              <span
                                className={cn(
                                  "text-[10px] font-medium tabular-nums whitespace-nowrap",
                                  effectiveStatus === "error"
                                    ? "text-destructive"
                                    : effectiveStatus === "skipped"
                                      ? "text-muted-foreground/70"
                                      : isSelected
                                        ? "text-primary-foreground/80"
                                        : "text-muted-foreground"
                                )}
                              >
                                {(node.endSec - node.startSec).toFixed(1)}s
                              </span>
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent
                          side="top"
                          sideOffset={6}
                          className="bg-white dark:bg-card text-foreground border border-border shadow-md"
                          hideArrow
                        >
                          <span className="font-medium">{node.label}</span>
                          {effectiveStatus === "skipped" ? (
                            <span className="text-muted-foreground"> · Incomplete (run failed earlier)</span>
                          ) : (
                            <span className="text-muted-foreground"> · {(node.endSec - node.startSec).toFixed(1)}s</span>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
    </TooltipProvider>
  )
}
