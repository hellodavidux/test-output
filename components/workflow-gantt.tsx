"use client"

import React, { useState, useMemo } from "react"
import {
  ChevronDown,
  ChevronRight,
  Play,
  Bot,
  FileText,
  Mail,
  CheckSquare,
  Send,
  Folder,
  Route,
  GitBranch,
  Check,
  X,
  Loader2,
  GitCompare,
  Shield,
  Wrench,
  Sparkles,
  MessageSquare,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

/** Sub-steps inside an AI Agent node (tools, thinking, completion, guardrail) — times are offsets from the parent row’s startSec. */
export interface LlmSpan {
  id: string
  label: string
  startOffset: number
  endOffset: number
  kind: "thinking" | "tool" | "completion" | "guardrail"
  /** Only used when kind === "guardrail". */
  result?: "pass" | "flag" | "block"
}

export interface GanttNode {
  id: string
  label: string
  startSec: number
  endSec: number
  depth: number
  hasChildren: boolean
  icon?: "play" | "zap" | "file" | "mail" | "check" | "send" | "folder" | "route" | "branch"
  status?: "error" | "success"
  llmSpans?: LlmSpan[]
  /** 0–100 eval score for this node in a specific run. */
  score?: number
  /** True when this node is identified as the root cause of a quality failure. */
  rootCause?: boolean
}

const AGENT_SPANS_STANDARD: LlmSpan[] = [
  { id: "think", label: "Reasoning", startOffset: 0.15, endOffset: 1.1, kind: "thinking" },
  { id: "tool1", label: "classify_intent", startOffset: 1.2, endOffset: 2.8, kind: "tool" },
  { id: "tool2", label: "search_kb", startOffset: 2.85, endOffset: 4.2, kind: "tool" },
  { id: "guardrail-1", label: "PII check", startOffset: 4.21, endOffset: 4.42, kind: "guardrail", result: "pass" },
  { id: "complete", label: "Completion", startOffset: 4.45, endOffset: 6.6, kind: "completion" },
]

export const GANTT_NODES: GanttNode[] = [
  { id: "1-email", label: "Receive Email", startSec: 0, endSec: 0.55, depth: 0, hasChildren: false, icon: "play" },
  { id: "1-chat", label: "Chatbot Input", startSec: 0, endSec: 0.55, depth: 0, hasChildren: false, icon: "play" },
  { id: "9", label: "Email Preprocessing", startSec: 0.1, endSec: 4.6, depth: 0, hasChildren: true, icon: "folder" },
  { id: "9-1", label: "Parse Headers", startSec: 0.1, endSec: 1.05, depth: 1, hasChildren: false, icon: "play" },
  {
    id: "9-2",
    label: "Extract Intent",
    startSec: 1.05,
    endSec: 3.35,
    depth: 1,
    hasChildren: false,
    icon: "zap",
    llmSpans: [
      { id: "think", label: "Reasoning", startOffset: 0.05, endOffset: 0.45, kind: "thinking" },
      { id: "tool1", label: "classify_intent", startOffset: 0.5, endOffset: 1.65, kind: "tool" },
      { id: "complete", label: "Completion", startOffset: 1.7, endOffset: 2.25, kind: "completion" },
    ],
  },
  { id: "9-3", label: "Attach to Ticket", startSec: 3.35, endSec: 4.55, depth: 1, hasChildren: false, icon: "check" },
  {
    id: "2",
    label: "Intent Classifier",
    startSec: 4.6,
    endSec: 9.4,
    depth: 0,
    hasChildren: false,
    icon: "zap",
    llmSpans: AGENT_SPANS_STANDARD,
  },
  { id: "3", label: "Knowledge Base Lookup", startSec: 9.4, endSec: 11.4, depth: 0, hasChildren: false, icon: "file" },
  {
    id: "4",
    label: "Draft Response",
    startSec: 11.4,
    endSec: 16.2,
    depth: 0,
    hasChildren: false,
    icon: "zap",
    llmSpans: [
      { id: "think", label: "Reasoning", startOffset: 0.25, endOffset: 1.65, kind: "thinking" },
      { id: "tool1", label: "search_kb", startOffset: 1.75, endOffset: 3.55, kind: "tool" },
      { id: "tool2", label: "check_ticket_history", startOffset: 3.65, endOffset: 4.65, kind: "tool" },
      { id: "guardrail-1", label: "Policy validator", startOffset: 4.66, endOffset: 4.78, kind: "guardrail", result: "flag" },
      { id: "complete", label: "Completion", startOffset: 4.79, endOffset: 4.8, kind: "completion" },
    ],
  },
  { id: "7", label: "If / Else", startSec: 14.8, endSec: 15.45, depth: 0, hasChildren: false, icon: "branch" },
  { id: "8", label: "Update CRM Record", startSec: 15.45, endSec: 16.05, depth: 0, hasChildren: false, icon: "file" },
  { id: "5", label: "Escalation Router", startSec: 16.2, endSec: 17.0, depth: 0, hasChildren: false, icon: "route" },
  { id: "6", label: "Send Reply", startSec: 17.0, endSec: 18.4, depth: 0, hasChildren: false, icon: "mail", status: "success" },
  { id: "10", label: "Output", startSec: 18.4, endSec: 19.85, depth: 0, hasChildren: false, icon: "send" },
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
    const newDur = newEndSec - newStartSec
    let llmSpans = node.llmSpans
    if (llmSpans?.length && duration > 0.01 && newDur > 0) {
      const scale = newDur / duration
      llmSpans = llmSpans.map((s) => ({
        ...s,
        startOffset: s.startOffset * scale,
        endOffset: s.endOffset * scale,
      }))
    }
    return { ...node, startSec: newStartSec, endSec: newEndSec, llmSpans }
  })
}

export const FIRST_GANTT_NODE: GanttNode = MOCK_NODES.find((n) => n.id === "2") ?? MOCK_NODES[0]

const ROW_HEIGHT = 36
const LLM_SPAN_ROW_HEIGHT = 30
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
  const playIndex = visibleNodes.slice(0, idx + 1).filter((n) => n.icon === "play").length - 1
  const zapIndex = visibleNodes.slice(0, idx + 1).filter((n) => n.icon === "zap").length - 1
  if (label.includes("user input") || node.icon === "play") return `in-${Math.max(0, playIndex)}`
  if (label === "output" || node.icon === "send") return `out-${sameLabelCount}`
  if (label === "ai agent" || node.icon === "zap") return `llm-${Math.max(0, zapIndex)}`
  if (label === "ai routing" || node.icon === "route") return "routing"
  if (label.includes("if") || label.includes("else") || node.icon === "branch") return `ifelse-${sameLabelCount}`
  if (label.includes("loop") || node.hasChildren || node.icon === "folder") return `loop_subflow-${sameLabelCount}`
  if (label.includes("delay")) return `delay-${sameLabelCount}`
  return `action-${Math.max(0, actionCount)}`
}

export function hasLlmSpanDetail(node: GanttNode): boolean {
  return Boolean(node.llmSpans?.length)
}

function spanAbsoluteRange(parent: GanttNode, span: LlmSpan): { startSec: number; endSec: number } {
  const lo = parent.startSec
  const hi = parent.endSec
  const s = parent.startSec + span.startOffset
  const e = parent.startSec + span.endOffset
  return {
    startSec: Math.max(lo, Math.min(s, hi)),
    endSec: Math.max(lo, Math.min(e, hi)),
  }
}

function LlmSpanKindIcon({ kind, result }: { kind: LlmSpan["kind"]; result?: LlmSpan["result"] }) {
  switch (kind) {
    case "thinking":
      return <Sparkles className="h-3 w-3 text-violet-500/90" />
    case "tool":
      return <Wrench className="h-3 w-3 text-amber-600/90" />
    case "completion":
      return <MessageSquare className="h-3 w-3 text-sky-600/90" />
    case "guardrail":
      return (
        <Shield className={cn(
          "h-3 w-3",
          result === "block" ? "text-red-500/90" : result === "flag" ? "text-amber-500/90" : "text-emerald-600/90"
        )} />
      )
    default:
      return <Sparkles className="h-3 w-3 text-muted-foreground" />
  }
}

function llmSpanBarClass(kind: LlmSpan["kind"], selected: boolean, result?: LlmSpan["result"]): string {
  switch (kind) {
    case "thinking":
      return selected
        ? "bg-violet-500/35 border-violet-500/60"
        : "bg-violet-500/15 border-violet-500/35 group-hover:bg-violet-500/25"
    case "tool":
      return selected
        ? "bg-amber-500/35 border-amber-500/60"
        : "bg-amber-500/15 border-amber-500/35 group-hover:bg-amber-500/25"
    case "completion":
      return selected
        ? "bg-sky-500/35 border-sky-500/60"
        : "bg-sky-500/15 border-sky-500/35 group-hover:bg-sky-500/25"
    case "guardrail":
      if (result === "block") return selected ? "bg-red-500/35 border-red-500/60" : "bg-red-500/15 border-red-500/35 group-hover:bg-red-500/25"
      if (result === "flag") return selected ? "bg-amber-500/35 border-amber-500/60" : "bg-amber-500/15 border-amber-500/35 group-hover:bg-amber-500/25"
      return selected ? "bg-emerald-500/35 border-emerald-500/60" : "bg-emerald-500/15 border-emerald-500/35 group-hover:bg-emerald-500/25"
    default:
      return "bg-muted border-border"
  }
}

type GanttDisplayRow =
  | { rowType: "node"; node: GanttNode }
  | { rowType: "llm-span"; parent: GanttNode; span: LlmSpan }

export function GanttNodeIcon({ type }: { type?: GanttNode["icon"] }) {
  switch (type) {
    case "play":
      return <Play className="h-3.5 w-3.5 text-muted-foreground" />
    case "zap":
      return <Bot className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
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
  /** Called when the compare action is triggered on an AI Agent row. */
  onCompareClick?: (node: GanttNode) => void
  /** When set, this node id is marked with a signal warning indicator. */
  signalNodeId?: string | null
  /** When set, this node id is highlighted as the root cause of a quality failure. */
  rootCauseNodeId?: string | null
}

export function WorkflowGantt({ selectedNodeId = null, onNodeSelect, compact = false, isRunning = false, runStartTime = null, nodes: nodesProp, highlightNodeId = null, onCompareClick, signalNodeId = null, rootCauseNodeId = null }: WorkflowGanttProps) {
  const sourceNodes = nodesProp ?? MOCK_NODES
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set(["9"]))
  const [expandedLlmAgentIds, setExpandedLlmAgentIds] = useState<Set<string>>(new Set())
  const [now, setNow] = useState(() => Date.now())
  const compactScrollRef = React.useRef<HTMLDivElement>(null)
  const ganttChartRef = React.useRef<HTMLDivElement>(null)
  const [hoverSec, setHoverSec] = useState<number | null>(null)
  const [chartBarWidth, setChartBarWidth] = useState(0)

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

  const ganttDisplayRows = useMemo((): GanttDisplayRow[] => {
    const out: GanttDisplayRow[] = []
    for (const node of visibleNodes) {
      out.push({ rowType: "node", node })
      const isIncomplete = errorEndSec >= 0 && node.startSec > errorEndSec
      if (hasLlmSpanDetail(node) && expandedLlmAgentIds.has(node.id) && !isIncomplete) {
        for (const span of node.llmSpans!) {
          out.push({ rowType: "llm-span", parent: node, span })
        }
      }
    }
    return out
  }, [visibleNodes, expandedLlmAgentIds, errorEndSec])

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
        <div className="flex flex-col min-h-0 overflow-y-auto rounded border border-border/40 bg-card" data-workflow-gantt>
          <div className="flex flex-row flex-shrink-0">
            {/* Left column: sticky labels (no horizontal scroll) */}
            <div
              className="flex flex-col flex-shrink-0 border-r border-border/40 bg-card"
              style={{ width: COMPACT_LEFT_WIDTH }}
            >
              {/* Node label cells */}
              {ganttDisplayRows.map((row) => {
                if (row.rowType === "llm-span") {
                  const { parent, span } = row
                  const isSelected = selectedNodeId === parent.id
                  return (
                    <div
                      key={`${parent.id}-c-${span.id}`}
                      data-gantt-row
                      className="group flex flex-shrink-0 items-center border-b border-border/20 last:border-b-0 bg-muted/10 px-2 py-1 cursor-pointer hover:bg-muted/25 overflow-hidden"
                      style={{ height: COMPACT_ROW_HEIGHT - 2 }}
                      role="button"
                      tabIndex={0}
                      onClick={() => onNodeSelect?.(parent)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault()
                          onNodeSelect?.(parent)
                        }
                      }}
                    >
                      <span
                        className={cn(
                          "flex items-center gap-1.5 rounded py-0.5 pl-3 pr-1 min-w-0 flex-1 text-xs truncate",
                          isSelected && "bg-muted/50"
                        )}
                      >
                        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-muted/50 border border-border/40">
                          <LlmSpanKindIcon kind={span.kind} result={span.result} />
                        </span>
                        <span className="truncate text-muted-foreground flex-1 min-w-0 font-mono">{span.label}</span>
                      </span>
                    </div>
                  )
                }
                const node = row.node
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
                    data-gantt-row
                    className="group flex flex-shrink-0 items-center border-b border-border/20 last:border-b-0 bg-muted/20 px-2 py-1.5 cursor-pointer hover:bg-muted/30 overflow-hidden"
                    style={{ height: COMPACT_ROW_HEIGHT }}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      if (hasLlmSpanDetail(node)) {
                        setExpandedLlmAgentIds((prev) => {
                          const next = new Set(prev)
                          if (next.has(node.id)) next.delete(node.id)
                          else next.add(node.id)
                          return next
                        })
                      }
                      onNodeSelect?.(node)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        if (hasLlmSpanDetail(node)) {
                          setExpandedLlmAgentIds((prev) => {
                            const next = new Set(prev)
                            if (next.has(node.id)) next.delete(node.id)
                            else next.add(node.id)
                            return next
                          })
                        }
                        onNodeSelect?.(node)
                      }
                    }}
                  >
                    <span
                      className={cn(
                        "flex items-center gap-1.5 rounded py-0.5 px-1 min-w-0 flex-1 hover:bg-muted/30 text-xs truncate",
                        isSelected && "bg-muted",
                        (hasLlmSpanDetail(node) || node.hasChildren) && "group/icon"
                      )}
                    >
                      {hasLlmSpanDetail(node) ? (
                        <span className="relative flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-muted/60 border border-border/50">
                          {expandedLlmAgentIds.has(node.id) ? (
                            <ChevronDown className="h-3 w-3 text-muted-foreground" />
                          ) : (
                            <>
                              <span className="flex group-hover/icon:hidden">
                                <GanttNodeIcon type={node.icon} />
                              </span>
                              <span className="pointer-events-none hidden group-hover/icon:flex absolute inset-0 items-center justify-center">
                                <ChevronRight className="h-3 w-3 text-muted-foreground" />
                              </span>
                            </>
                          )}
                        </span>
                      ) : node.hasChildren ? (
                        <button
                          type="button"
                          className="relative flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-muted/60 border border-border/50 hover:bg-muted"
                          onClick={(e) => {
                            e.stopPropagation()
                            toggle(node.id)
                          }}
                          aria-label={collapsed.has(node.id) ? "Expand" : "Collapse"}
                        >
                          {collapsed.has(node.id) ? (
                            <>
                              <span className="flex group-hover/icon:hidden">
                                <GanttNodeIcon type={node.icon} />
                              </span>
                              <span className="pointer-events-none hidden group-hover/icon:flex absolute inset-0 items-center justify-center">
                                <ChevronRight className="h-3 w-3 text-muted-foreground" />
                              </span>
                            </>
                          ) : (
                            <ChevronDown className="h-3 w-3 text-muted-foreground" />
                          )}
                        </button>
                      ) : (
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-muted/60 border border-border/50">
                          <GanttNodeIcon type={node.icon} />
                        </span>
                      )}
                      <span className="truncate text-foreground flex-1 min-w-0">{node.label}</span>
                      {node.label === "AI Agent" && (
                        <Tooltip delayDuration={200}>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
                              aria-label="Compare"
                              onClick={(e) => {
                                e.stopPropagation()
                                onCompareClick?.(node)
                              }}
                            >
                              <GitCompare className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top" sideOffset={4} className="text-xs bg-white dark:bg-card border border-border shadow-md" hideArrow>
                            Compare
                          </TooltipContent>
                        </Tooltip>
                      )}
                      <span
                        className={cn(
                          "flex h-3 w-3 shrink-0 items-center justify-center rounded-full",
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
                {ganttDisplayRows.map((row) => {
                  if (row.rowType === "llm-span") {
                    const { parent, span } = row
                    const isIncomplete = errorEndSec >= 0 && parent.startSec > errorEndSec
                    const displayStatus = parent.status === "error" ? "error" : isIncomplete ? "skipped" : (parent.status ?? "success")
                    const isSelected = selectedNodeId === parent.id
                    const { startSec: t0, endSec: t1 } = spanAbsoluteRange(parent, span)
                    const leftPx = (t0 / maxSec) * (barAreaWidth ?? 0)
                    const barWidthPx = Math.max((t1 - t0) * COMPACT_PX_PER_SEC, displayStatus === "skipped" ? 0 : 6)
                    return (
                      <div
                        key={`${parent.id}-cb-${span.id}`}
                        className="group relative flex flex-shrink-0 items-center cursor-pointer hover:bg-muted/15 border-b border-border/20 last:border-b-0 overflow-hidden pl-1 pr-1"
                        style={{ height: COMPACT_ROW_HEIGHT - 2, minWidth: barAreaWidth }}
                        role="button"
                        tabIndex={0}
                        onClick={() => onNodeSelect?.(parent)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault()
                            onNodeSelect?.(parent)
                          }
                        }}
                      >
                        {displayStatus !== "skipped" ? (
                          <Tooltip delayDuration={200}>
                            <TooltipTrigger asChild>
                              <div
                                className={cn(
                                  "absolute rounded-sm border flex-shrink-0 min-w-[2px] flex items-center justify-start pl-0.5 pr-0.5 overflow-hidden cursor-default ml-2",
                                  "top-1/2 -translate-y-1/2",
                                  llmSpanBarClass(span.kind, isSelected, span.result)
                                )}
                                style={{
                                  left: leftPx,
                                  width: barWidthPx,
                                  height: 11,
                                }}
                              />
                            </TooltipTrigger>
                            <TooltipContent side="top" sideOffset={4} className="text-xs bg-white dark:bg-card border border-border shadow-md" hideArrow>
                              <span className="font-medium">{span.label}</span>
                              <span className="text-muted-foreground"> · {(t1 - t0).toFixed(2)}s</span>
                            </TooltipContent>
                          </Tooltip>
                        ) : null}
                      </div>
                    )
                  }
                  const node = row.node
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
                  const displayStatus =
                    node.status === "error" ? "error" : isIncomplete ? "skipped" : baseStatus
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
      data-workflow-gantt
      className="rounded-lg bg-card border shadow-sm overflow-hidden flex flex-col flex-1 min-h-0 p-0 pb-3 gap-0"
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("[data-gantt-row]")) return
        onNodeSelect?.(null)
      }}
    >
      <CardContent className="p-0 flex flex-1 flex-col min-h-0">
        <div
          ref={ganttChartRef}
          className="relative flex flex-1 min-h-0 flex-col min-w-0"
          onMouseMove={(e) => {
            const el = ganttChartRef.current
            if (!el) return
            const rect = el.getBoundingClientRect()
            const barLeft = rect.left + LEFT_WIDTH
            const barW = rect.width - LEFT_WIDTH
            if (barW <= 0) return
            if (e.clientX < barLeft) {
              setHoverSec(null)
              return
            }
            const sec = Math.max(0, Math.min(maxSec, ((e.clientX - barLeft) / barW) * maxSec))
            setHoverSec(sec)
            setChartBarWidth(barW)
          }}
          onMouseLeave={() => setHoverSec(null)}
        >
          {/* Hover vertical line */}
          {hoverSec !== null && chartBarWidth > 0 && (
            <>
              <div
                className="absolute top-0 bottom-0 w-px bg-muted-foreground/[0.07] pointer-events-none z-10"
                style={{
                  left: LEFT_WIDTH + (hoverSec / maxSec) * chartBarWidth,
                }}
                aria-hidden
              />
              {/* Seconds label in time axis row (aligned with line) */}
              <span
                className="absolute text-[10px] text-muted-foreground/80 tabular-nums whitespace-nowrap pointer-events-none z-10 px-1.5 py-0.5 rounded bg-muted/80 dark:bg-muted"
                style={{
                  top: 2,
                  left: LEFT_WIDTH + (hoverSec / maxSec) * chartBarWidth,
                  transform: "translateX(-50%)",
                }}
              >
                {hoverSec.toFixed(1)}s
              </span>
            </>
          )}
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
              {ganttDisplayRows.map((row, rowIdx) => {
                if (row.rowType === "llm-span") {
                  const { parent, span } = row
                  const isIncomplete = errorEndSec >= 0 && parent.startSec > errorEndSec
                  const effectiveStatus = parent.status === "error" ? "error" : isIncomplete ? "skipped" : (parent.status ?? "success")
                  const isSelected = selectedNodeId === parent.id
                  const isHighlighted = highlightNodeId === parent.id
                  const { startSec: t0, endSec: t1 } = spanAbsoluteRange(parent, span)
                  const leftPctSpan = (t0 / maxSec) * 100
                  const widthPctSpan = Math.max(((t1 - t0) / maxSec) * 100, 0.35)
                  const durSpan = Math.max(0, t1 - t0)
                  return (
                    <div
                      key={`${parent.id}-llm-${span.id}`}
                      data-gantt-row
                      className={cn(
                        "group flex items-center flex-shrink-0 cursor-pointer hover:bg-muted/20 border-b border-border/30 pr-8 bg-muted/5",
                        isSelected && "bg-muted/20 shadow-[inset_2px_0_0_0_hsl(var(--primary))]",
                        isHighlighted && "bg-primary/5 hover:bg-primary/5"
                      )}
                      style={{ minHeight: LLM_SPAN_ROW_HEIGHT }}
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation()
                        onNodeSelect?.(parent)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault()
                          e.stopPropagation()
                          onNodeSelect?.(parent)
                        }
                      }}
                    >
                      <div
                        className="flex items-center gap-0 h-8 text-sm flex-shrink-0 bg-muted/10 border-r border-border/40 overflow-hidden"
                        style={{ width: LEFT_WIDTH, paddingLeft: parent.depth * 16 + 20 }}
                      >
                        <span className="w-6 shrink-0" aria-hidden />
                        <span className="flex items-center gap-1.5 rounded-md py-0.5 pl-0.5 pr-3 min-w-0 flex-1">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-muted/50 border border-border/40">
                            <LlmSpanKindIcon kind={span.kind} result={span.result} />
                          </span>
                          <span className="truncate text-xs text-muted-foreground flex-1 min-w-0 font-mono">{span.label}</span>
                        </span>
                      </div>
                      <div
                        className="flex-1 min-w-0 relative h-8 flex items-center pl-8 pr-8"
                        onClick={(e) => {
                          e.stopPropagation()
                          onNodeSelect?.(parent)
                        }}
                        role="presentation"
                      >
                        {effectiveStatus !== "skipped" ? (
                          <Tooltip delayDuration={200}>
                            <TooltipTrigger asChild>
                              <div
                                className={cn(
                                  "absolute h-4 rounded-sm border flex-shrink-0 min-w-[2px] transition-colors flex items-center justify-start pl-1 pr-0.5 overflow-hidden cursor-default ml-2",
                                  llmSpanBarClass(span.kind, isSelected, span.result)
                                )}
                                style={{
                                  left: `${leftPctSpan}%`,
                                  width: `${widthPctSpan}%`,
                                }}
                              >
                                {widthPctSpan >= 2 && (
                                  <span className="text-[9px] font-medium tabular-nums whitespace-nowrap text-muted-foreground">
                                    {durSpan.toFixed(2)}s
                                  </span>
                                )}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" sideOffset={6} className="bg-white dark:bg-card text-foreground border border-border shadow-md" hideArrow>
                              <span className="font-medium">{span.label}</span>
                              {span.kind === "guardrail" ? (
                                <span className={cn(
                                  "ml-1.5 inline-flex items-center rounded px-1 py-0.5 text-[10px] font-semibold",
                                  span.result === "block" && "bg-red-100 text-red-700",
                                  span.result === "flag" && "bg-amber-100 text-amber-700",
                                  (!span.result || span.result === "pass") && "bg-emerald-100 text-emerald-700",
                                )}>
                                  {span.result === "block" ? "Blocked" : span.result === "flag" ? "Flagged" : "Passed"}
                                </span>
                              ) : (
                                <span className="text-muted-foreground"> · {span.kind} · {durSpan.toFixed(2)}s</span>
                              )}
                            </TooltipContent>
                          </Tooltip>
                        ) : null}
                      </div>
                    </div>
                  )
                }
                const node = row.node
                const isIncomplete = errorEndSec >= 0 && node.startSec > errorEndSec
                const effectiveStatus = node.status === "error" ? "error" : isIncomplete ? "skipped" : (node.status ?? "success")
                const isSelected = selectedNodeId === node.id
                const isHighlighted = highlightNodeId === node.id
                const isSignaled = signalNodeId === node.id
                const isRootCause = rootCauseNodeId === node.id
                const leftPct = (node.startSec / maxSec) * 100
                const widthPct = Math.max((node.endSec - node.startSec) / maxSec * 100, 1)
                return (
                  <div
                    key={node.id}
                    data-gantt-row
                    className={cn(
                      "group flex items-center flex-shrink-0 cursor-pointer hover:bg-muted/30 border-b border-border/30 pr-8",
                      rowIdx === 0 && "border-t border-border/30",
                      isSelected && "bg-muted/30 shadow-[inset_2px_0_0_0_hsl(var(--primary))]",
                      isHighlighted && "bg-primary/5 hover:bg-primary/5",
                      isSignaled && "bg-amber-50/60 shadow-[inset_2px_0_0_0_theme(colors.amber.400)] hover:bg-amber-50/80",
                      isRootCause && "bg-red-50/50 shadow-[inset_2px_0_0_0_theme(colors.red.400)] hover:bg-red-50/70 dark:bg-red-950/20 dark:shadow-[inset_2px_0_0_0_theme(colors.red.600)]"
                    )}
                    style={{ minHeight: ROW_HEIGHT }}
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation()
                      if (hasLlmSpanDetail(node)) {
                        setExpandedLlmAgentIds((prev) => {
                          const next = new Set(prev)
                          if (next.has(node.id)) next.delete(node.id)
                          else next.add(node.id)
                          return next
                        })
                        onNodeSelect?.(node)
                        return
                      }
                      onNodeSelect?.(isSelected ? null : node)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        if (hasLlmSpanDetail(node)) {
                          setExpandedLlmAgentIds((prev) => {
                            const next = new Set(prev)
                            if (next.has(node.id)) next.delete(node.id)
                            else next.add(node.id)
                            return next
                          })
                          onNodeSelect?.(node)
                          return
                        }
                        onNodeSelect?.(isSelected ? null : node)
                      }
                    }}
                  >
                    {/* Left: task label */}
                    <div
                      className={cn(
                        "flex items-center gap-0 h-9 text-sm flex-shrink-0 bg-muted/20 border-r border-border/40 overflow-hidden",
                        node.hasChildren && "group/icon"
                      )}
                      style={{ width: LEFT_WIDTH, paddingLeft: node.depth * 16 }}
                    >
                      <span className="w-6 shrink-0" aria-hidden />
                      <span
                        role="button"
                        tabIndex={0}
                        className={cn(
                          "flex items-center gap-1.5 rounded-md py-0.5 pl-0.5 pr-3 min-w-0 flex-1",
                          hasLlmSpanDetail(node) && !node.hasChildren && "group/icon"
                        )}
                        onClick={(e) => {
                          e.stopPropagation()
                          if (hasLlmSpanDetail(node)) {
                            setExpandedLlmAgentIds((prev) => {
                              const next = new Set(prev)
                              if (next.has(node.id)) next.delete(node.id)
                              else next.add(node.id)
                              return next
                            })
                            onNodeSelect?.(node)
                            return
                          }
                          onNodeSelect?.(node)
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault()
                            e.stopPropagation()
                            if (hasLlmSpanDetail(node)) {
                              setExpandedLlmAgentIds((prev) => {
                                const next = new Set(prev)
                                if (next.has(node.id)) next.delete(node.id)
                                else next.add(node.id)
                                return next
                              })
                            }
                            onNodeSelect?.(node)
                          }
                        }}
                      >
                        {node.hasChildren ? (
                          <button
                            type="button"
                            className="relative flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted/60 border border-border/50 hover:bg-muted cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation()
                              toggle(node.id)
                            }}
                            aria-label={collapsed.has(node.id) ? "Expand" : "Collapse"}
                          >
                            {collapsed.has(node.id) ? (
                              <>
                                <span className="flex group-hover/icon:hidden">
                                  <GanttNodeIcon type={node.icon} />
                                </span>
                                <span className="pointer-events-none hidden group-hover/icon:flex absolute inset-0 items-center justify-center">
                                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                                </span>
                              </>
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                            )}
                          </button>
                        ) : hasLlmSpanDetail(node) ? (
                          <span className="relative flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted/60 border border-border/50" aria-hidden>
                            {expandedLlmAgentIds.has(node.id) ? (
                              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                            ) : (
                              <>
                                <span className="flex group-hover/icon:hidden">
                                  <GanttNodeIcon type={node.icon} />
                                </span>
                                <span className="pointer-events-none hidden group-hover/icon:flex absolute inset-0 items-center justify-center">
                                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                                </span>
                              </>
                            )}
                          </span>
                        ) : (
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted/60 border border-border/50">
                            <GanttNodeIcon type={node.icon} />
                          </span>
                        )}
                        <span className={cn(
                          "truncate flex-1 min-w-0",
                          isRootCause ? "text-red-700 dark:text-red-400 font-medium" : isSignaled ? "text-amber-700 font-medium" : "text-foreground"
                        )}>
                          {node.label}
                        </span>
                        {isRootCause && (
                          <span className="shrink-0 inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400" title="Root cause of quality failure">
                            Root cause
                          </span>
                        )}
                        {isSignaled && !isRootCause && (
                          <span className="shrink-0 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-white" title="Signal detected on this node">
                            <span className="text-[9px] font-bold leading-none">!</span>
                          </span>
                        )}
                        {node.label === "AI Agent" && (
                          <Tooltip delayDuration={200}>
                            <TooltipTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
                                aria-label="Compare"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onCompareClick?.(node)
                                }}
                              >
                                <GitCompare className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top" sideOffset={4} className="text-xs bg-white dark:bg-card border border-border shadow-md" hideArrow>
                              Compare
                            </TooltipContent>
                          </Tooltip>
                        )}
                        <span
                          className={cn(
                            "flex h-3 w-3 shrink-0 items-center justify-center rounded-full",
                            effectiveStatus === "error" && "bg-red-500",
                            effectiveStatus === "success" && "bg-green-500",
                            effectiveStatus === "skipped" && "bg-muted-foreground/30"
                          )}
                          aria-label={effectiveStatus === "error" ? "Failed" : effectiveStatus === "success" ? "Success" : "Skipped"}
                        >
                          {effectiveStatus === "error" ? (
                            <X className="h-2 w-2 text-white stroke-[3]" />
                          ) : effectiveStatus === "success" ? (
                            <Check className="h-2 w-2 text-white stroke-[3]" />
                          ) : null}
                        </span>
                      </span>
                    </div>
                    {/* Right: Gantt bar - full width of remaining space */}
                    <div
                      className="flex-1 min-w-0 relative h-9 flex items-center pl-8 pr-8"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (hasLlmSpanDetail(node)) {
                          setExpandedLlmAgentIds((prev) => {
                            const next = new Set(prev)
                            if (next.has(node.id)) next.delete(node.id)
                            else next.add(node.id)
                            return next
                          })
                          onNodeSelect?.(node)
                          return
                        }
                        onNodeSelect?.(node)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault()
                          if (hasLlmSpanDetail(node)) {
                            setExpandedLlmAgentIds((prev) => {
                              const next = new Set(prev)
                              if (next.has(node.id)) next.delete(node.id)
                              else next.add(node.id)
                              return next
                            })
                          }
                          onNodeSelect?.(node)
                        }
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      {effectiveStatus !== "skipped" ? (
                        <Tooltip delayDuration={200}>
                          <TooltipTrigger asChild>
                            <div
                              className={cn(
                                "absolute h-5 rounded-sm border flex-shrink-0 min-w-[2px] transition-colors flex items-center justify-start pl-1.5 pr-1 overflow-hidden cursor-default ml-2",
                                effectiveStatus === "error"
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
                                    effectiveStatus === "error"
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
                      ) : null}
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
