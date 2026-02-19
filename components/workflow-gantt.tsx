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

const MOCK_NODES: GanttNode[] = [
  { id: "1", label: "User Input", startSec: 0, endSec: 1.2, depth: 0, hasChildren: false, icon: "play" },
  { id: "2", label: "AI Agent", startSec: 1.2, endSec: 8, depth: 0, hasChildren: false, icon: "zap" },
  { id: "2a", label: "AI Agent", startSec: 6.5, endSec: 14, depth: 0, hasChildren: false, icon: "zap" },
  { id: "3", label: "AI Routing", startSec: 12, endSec: 13.5, depth: 0, hasChildren: false, icon: "route" },
  { id: "4", label: "AI Agent", startSec: 2, endSec: 17, depth: 0, hasChildren: false, icon: "zap" },
  { id: "5", label: "Send Email", startSec: 13.5, endSec: 15, depth: 0, hasChildren: false, icon: "mail", status: "error" },
  { id: "6", label: "If/Else", startSec: 15, endSec: 16, depth: 0, hasChildren: false, icon: "branch" },
  { id: "7", label: "Notion", startSec: 15.5, endSec: 17, depth: 0, hasChildren: false, icon: "file" },
  { id: "8", label: "Output", startSec: 17, endSec: 18, depth: 0, hasChildren: false, icon: "send" },
  { id: "9", label: "Project node", startSec: 0, endSec: 6, depth: 0, hasChildren: true, icon: "folder" },
]

export const FIRST_GANTT_NODE: GanttNode = MOCK_NODES[1] // AI Agent - default when opening run detail

const ROW_HEIGHT = 36
const LEFT_WIDTH = 240
const SECONDS_MAX = 20
const TIME_HEADER_HEIGHT = 32

const COMPACT_ROW_HEIGHT = 28
const COMPACT_LEFT_WIDTH = 150
const COMPACT_TIME_HEADER_HEIGHT = 18
const COMPACT_PX_PER_SEC = 20

function NodeIcon({ type }: { type?: string }) {
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
}

export function WorkflowGantt({ selectedNodeId = null, onNodeSelect, compact = false, isRunning = false, runStartTime = null }: WorkflowGanttProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [now, setNow] = useState(() => Date.now())
  const compactScrollRef = React.useRef<HTMLDivElement>(null)

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

    for (const node of MOCK_NODES) {
      if (node.depth <= hideDepth) {
        if (node.depth === hideDepth) hideDepth = -1
        continue
      }
      if (collapsed.has(node.id) && node.hasChildren) {
        hideDepth = node.depth
      }
      visible.push(node)
      if (node.endSec > maxSec) maxSec = node.endSec
    }
    return { visibleNodes: visible, maxSec: Math.max(maxSec + 2, SECONDS_MAX) }
  }, [collapsed])

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
                const isSelected = selectedNodeId === node.id
                const isNodeRunning = simulatedSec != null && simulatedSec >= node.startSec && simulatedSec < node.endSec
                const isNodeFinished = simulatedSec != null && simulatedSec >= node.endSec
                const displayStatus = simulatedSec == null
                  ? (node.status ?? "success")
                  : isNodeFinished
                    ? (node.status ?? "success")
                    : "running"
                return (
                  <div
                    key={node.id}
                    className="group flex flex-shrink-0 items-center border-b border-border/20 last:border-b-0 bg-muted/20 px-2 cursor-pointer hover:bg-muted/30 overflow-hidden"
                    style={{ height: COMPACT_ROW_HEIGHT }}
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
                    <span
                      className={cn(
                        "flex items-center gap-1.5 rounded py-0.5 px-1 min-w-0 flex-1 hover:bg-muted/30 text-xs truncate",
                        isSelected && "bg-muted"
                      )}
                    >
                      <NodeIcon type={node.icon} />
                      <span className="truncate text-foreground flex-1 min-w-0">{node.label}</span>
                      <span
                        className={cn(
                          "flex h-2.5 w-2.5 shrink-0 items-center justify-center rounded-full",
                          displayStatus === "error" && "bg-red-500",
                          displayStatus === "success" && "bg-green-500",
                          displayStatus === "running" && "bg-purple-500"
                        )}
                      >
                        {displayStatus === "error" ? (
                          <X className="h-2 w-2 text-white stroke-[3]" />
                        ) : displayStatus === "running" ? (
                          <Loader2 className="h-2 w-2 text-white animate-spin stroke-[2.5]" />
                        ) : (
                          <Check className="h-2 w-2 text-white stroke-[3]" />
                        )}
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
                      className="group flex flex-shrink-0 items-center cursor-pointer hover:bg-muted/20 border-b border-border/20 last:border-b-0 overflow-hidden"
                      style={{ height: COMPACT_ROW_HEIGHT, minWidth: barAreaWidth }}
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
                      <div
                        className="relative flex items-center pl-1 pr-1 flex-1 min-w-0 h-full"
                        style={{ height: COMPACT_ROW_HEIGHT }}
                        role="button"
                        tabIndex={0}
                      >
                        <Tooltip delayDuration={200}>
                          <TooltipTrigger asChild>
                            <div
                              className={cn(
                                "absolute rounded-sm border flex-shrink-0 min-w-[2px] transition-[width] duration-150 flex items-center justify-start pl-1 pr-0.5 overflow-hidden cursor-default",
                                "top-1/2 -translate-y-1/2",
                                displayStatus === "error" && "bg-destructive/20 border-destructive/40",
                                displayStatus === "success" && (isSelected ? "bg-primary border-primary" : "bg-muted border-border"),
                                displayStatus === "running" && "bg-purple-500/30 border-purple-500/50"
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
                            {simulatedSec == null && (
                              <span className="text-muted-foreground"> · Done · {(node.endSec - node.startSec).toFixed(1)}s</span>
                            )}
                            {simulatedSec != null && isNodeRunning && (
                              <span className="text-muted-foreground"> · Running…</span>
                            )}
                            {simulatedSec != null && isNodeFinished && (
                              <span className="text-muted-foreground"> · Done · {(node.endSec - node.startSec).toFixed(1)}s</span>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      </div>
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
    <Card className="rounded-lg bg-card border shadow-sm overflow-hidden flex flex-col flex-1 min-h-0">
      <CardContent className="p-0 flex flex-1 flex-col min-h-0">
        <div className="flex flex-1 min-h-0 flex-col min-w-0">
          {/* Time axis row: aligns with node rows below */}
          <div className="flex flex-shrink-0" style={{ height: TIME_HEADER_HEIGHT }}>
            <div
              className="flex-shrink-0 bg-muted/30 flex items-center gap-2 border-r border-border/40"
              style={{ width: LEFT_WIDTH, paddingLeft: 6 }}
            >
              <span className="w-4 flex-shrink-0" aria-hidden />
              <span className="w-[14px] flex-shrink-0" aria-hidden />
            </div>
            <div className="flex-1 min-w-0 flex items-end pr-3">
              {Array.from({ length: Math.ceil(maxSec) + 1 }, (_, i) => i).map((sec) => (
                <div
                  key={sec}
                  className="text-[10px] text-muted-foreground tabular-nums flex-1 min-w-0 text-center pb-0.5"
                >
                  {sec % 5 === 0 ? `${sec}s` : ""}
                </div>
              ))}
            </div>
          </div>

          {/* Body: one row per node so list and bar stay aligned */}
          <ScrollArea className="flex-1 min-h-0">
            <div className="flex flex-col min-w-0">
              {visibleNodes.map((node) => {
                const isSelected = selectedNodeId === node.id
                const leftPct = (node.startSec / maxSec) * 100
                const widthPct = Math.max((node.endSec - node.startSec) / maxSec * 100, 1)
                return (
                  <div
                    key={node.id}
                    className="group flex items-center flex-shrink-0 cursor-pointer hover:bg-muted/30 border-b border-border/30 last:border-b-0 pr-3"
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
                      className="flex items-center gap-1 h-9 px-3 text-sm flex-shrink-0 bg-muted/20 border-r border-border/40 overflow-hidden"
                      style={{ width: LEFT_WIDTH, paddingLeft: 6 + node.depth * 16 }}
                    >
                      {node.hasChildren ? (
                        <button
                          type="button"
                          className="p-0.5 rounded hover:bg-muted -m-0.5"
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
                        <span className="w-4" />
                      )}
                      <span
                        role="button"
                        tabIndex={0}
                        className={cn(
                          "flex items-center gap-2 rounded-md py-1 px-2 min-w-0 flex-1 hover:bg-muted/30",
                          isSelected && "bg-muted"
                        )}
                        onClick={(e) => {
                          e.stopPropagation()
                          onNodeSelect?.(isSelected ? null : node)
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault()
                            e.stopPropagation()
                            onNodeSelect?.(isSelected ? null : node)
                          }
                        }}
                      >
                        <NodeIcon type={node.icon} />
                        <span className="truncate text-foreground flex-1 min-w-0">
                          {node.label}
                        </span>
                        <span
                          className={cn(
                            "flex h-2.5 w-2.5 shrink-0 items-center justify-center rounded-full",
                            node.status === "error" ? "bg-red-500" : "bg-green-500"
                          )}
                          aria-label={node.status === "error" ? "Failed" : "Success"}
                        >
                          {node.status === "error" ? (
                            <X className="h-1.5 w-1.5 text-white stroke-[3]" />
                          ) : (
                            <Check className="h-1.5 w-1.5 text-white stroke-[3]" />
                          )}
                        </span>
                      </span>
                    </div>
                    {/* Right: Gantt bar - full width of remaining space */}
                    <div
                      className="flex-1 min-w-0 relative h-9 flex items-center pl-8 pr-3"
                      onClick={(e) => {
                        e.stopPropagation()
                        onNodeSelect?.(isSelected ? null : node)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault()
                          onNodeSelect?.(isSelected ? null : node)
                        }
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      <Tooltip delayDuration={200}>
                        <TooltipTrigger asChild>
                          <div
                            className={cn(
                              "absolute h-5 rounded-sm border flex-shrink-0 min-w-[2px] transition-colors flex items-center justify-start pl-1.5 pr-1 overflow-hidden cursor-default",
                              node.status === "error"
                                ? isSelected
                                  ? "bg-destructive/25 border-destructive/50 group-hover:bg-destructive/35"
                                  : "bg-destructive/20 border-destructive/40 group-hover:bg-destructive/30"
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
                                  node.status === "error"
                                    ? "text-destructive"
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
                          <span className="text-muted-foreground"> · {(node.endSec - node.startSec).toFixed(1)}s</span>
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
