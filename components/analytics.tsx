"use client"

import React, { useState, useEffect, useMemo } from "react"
import { createPortal } from "react-dom"
import { 
  RefreshCw, 
  Calendar as CalendarIcon, 
  Download, 
  Filter, 
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
  ArrowUpDown,
  Info,
  Workflow,
  X,
  Hash,
  MessageCircle,
  Clock,
  Bot,
  User,
  Link2,
  ArrowDownToLine,
  ArrowUpFromLine,
  AlertCircle,
  Maximize2,
  Locate,
  GitCompare,
  ArrowRight,
  ArrowLeft,
  Copy,
  Check,
  Database,
  ListChecks,
  Plus,
  CircleAlert,
  TriangleAlert,
  MoreHorizontal,
  MoreVertical,
  MapPin,
  GitFork,
  Shield,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid } from "recharts"
import { UnifiedAlertsPanel } from "@/components/analytics-overview-alerts"
import { Guardrails } from "@/components/guardrails"
import { WorkflowGantt, type GanttNode, GANTT_NODES, GanttNodeIcon, varyGanttNodesByRunId } from "@/components/workflow-gantt"
import {
  EVALUATOR_PASS_THRESHOLDS,
  ManusTipBanner,
  WORKFLOW_NODES,
  VariantNodeConfigFields,
  WorkflowNodeLucideIcon,
  defaultValuesForNode,
} from "@/components/evaluator"
import { Command, CommandEmpty, CommandItem, CommandList } from "@/components/ui/command"
import { TabContext } from "@/components/dashboard-layout"
import type { RunData } from "@/lib/analytics-runs"
import { formatAnalyticsRunTimestamp } from "@/lib/analytics-runs"
import { CollapsibleJsonView } from "@/components/collapsible-json"
import { toast } from "sonner"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerTitle,
} from "@/components/ui/drawer"

// Renders text as beautified JSON (parsed if valid JSON, otherwise wrapped in { "message": "..." }) with syntax highlighting
function BeautifiedJson({ text, className }: { text: string; className?: string }) {
  let jsonStr: string
  try {
    const parsed = JSON.parse(text.trim())
    jsonStr = JSON.stringify(parsed, null, 2)
  } catch {
    jsonStr = JSON.stringify({ message: text }, null, 2)
  }

  // Tokenize for syntax highlighting: key, string, number, boolean, null, punctuation
  const tokens: { type: "key" | "string" | "number" | "boolean" | "null" | "punctuation" | "whitespace"; value: string }[] = []
  let i = 0
  const s = jsonStr
  while (i < s.length) {
    if (/\s/.test(s[i])) {
      let w = ""
      while (i < s.length && /\s/.test(s[i])) {
        w += s[i]
        i++
      }
      tokens.push({ type: "whitespace", value: w })
      continue
    }
    if (s[i] === "{" || s[i] === "}" || s[i] === "[" || s[i] === "]" || s[i] === ":" || s[i] === ",") {
      tokens.push({ type: "punctuation", value: s[i] })
      i++
      continue
    }
    if (s[i] === '"') {
      let w = '"'
      i++
      while (i < s.length && s[i] !== '"') {
        if (s[i] === "\\") {
          w += s[i]
          if (i + 1 < s.length) w += s[i + 1]
          i += 2
          continue
        }
        w += s[i]
        i++
      }
      if (i < s.length) w += '"'
      i++
      // Next non-whitespace is ':' -> this was a key
      let j = i
      while (j < s.length && /\s/.test(s[j])) j++
      const isKey = s[j] === ":"
      tokens.push({ type: isKey ? "key" : "string", value: w })
      continue
    }
    // number, true, false, null
    const numMatch = s.slice(i).match(/^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/)
    if (numMatch) {
      tokens.push({ type: "number", value: numMatch[0] })
      i += numMatch[0].length
      continue
    }
    if (s.slice(i, i + 4) === "true") {
      tokens.push({ type: "boolean", value: "true" })
      i += 4
      continue
    }
    if (s.slice(i, i + 5) === "false") {
      tokens.push({ type: "boolean", value: "false" })
      i += 5
      continue
    }
    if (s.slice(i, i + 4) === "null") {
      tokens.push({ type: "null", value: "null" })
      i += 4
      continue
    }
    tokens.push({ type: "punctuation", value: s[i] })
    i++
  }

  const typeClass = {
    key: "text-amber-700 dark:text-amber-400",
    string: "text-emerald-700 dark:text-emerald-400",
    number: "text-blue-600 dark:text-blue-400",
    boolean: "text-blue-600 dark:text-blue-400",
    null: "text-muted-foreground",
    punctuation: "text-foreground/80",
    whitespace: "",
  }

  return (
    <pre className={cn("text-sm font-mono overflow-x-hidden overflow-y-auto break-words whitespace-pre-wrap", className)}>
      {tokens.map((t, idx) =>
        t.type === "whitespace" ? (
          <span key={idx}>{t.value}</span>
        ) : (
          <span key={idx} className={typeClass[t.type]}>{t.value}</span>
        )
      )}
    </pre>
  )
}

type ConversationTurn = { role: "user" | "assistant"; text: string }

interface ConversationPreview {
  id: string
  listLabel: string
  title: string
  userLabel: string
  dateLabel: string
  /** Mock link to a run for "See run" → Gantt view */
  runId: string
  messages: ConversationTurn[]
}

const mockConversations: ConversationPreview[] = [
  {
    id: "conv-billing-1",
    listLabel: "sarah.chen@example.com",
    title: "Charged after cancellation",
    userLabel: "sarah.chen@example.com",
    dateLabel: "Apr 15, 2026",
    runId: "8af162da-6ee4-4bcf-aa7a-99b1f4adf151",
    messages: [
      { role: "user", text: "Hi — I cancelled my account 3 weeks ago but was just charged $299. This is unacceptable." },
      { role: "assistant", text: "Hi Sarah, I'm really sorry about this — a charge after cancellation should never happen. Let me pull up your account now." },
      { role: "assistant", text: "I can confirm your cancellation was processed on March 25th, and the $299 charge on April 14th was applied in error. I've initiated a full refund — it should appear within 3–5 business days." },
      { role: "assistant", text: "You'll receive a confirmation email shortly. Again, I apologize for the inconvenience. Is there anything else I can help with?" },
    ],
  },
  {
    id: "conv-cancel-2",
    listLabel: "m.torres@acme.io",
    title: "Cancel button not working",
    userLabel: "m.torres@acme.io",
    dateLabel: "Apr 17, 2026",
    runId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    messages: [
      { role: "user", text: "I'm trying to cancel my subscription but the cancel button on the billing page just spins and never completes. I've tried 3 browsers." },
      { role: "assistant", text: "I'm sorry you're running into this — a broken cancel flow is a serious issue and I want to make sure this doesn't block you." },
      { role: "assistant", text: "I've escalated this as a high-priority bug to our engineering team. In the meantime, I can process the cancellation manually on your behalf. Would you like me to do that now?" },
      { role: "user", text: "Yes please, cancel it now." },
      { role: "assistant", text: "Done — your subscription has been cancelled and you'll receive a confirmation email within the next few minutes. Engineering is also tracking the button issue for a fix." },
    ],
  },
]

/** Run detail uses this id for an empty fork draft (not a row in the runs table). */
const FORK_DRAFT_RUN_ID = "__fork-draft__"

function resolveForkSourceRun(payload: { runId: string; caseInput?: string }, runs: RunData[]): RunData {
  const found = runs.find((r) => r.runId === payload.runId)
  if (found) return found
  return {
    runId: payload.runId,
    conversationId: "N/A",
    created: "—",
    origin: "Sandbox",
    version: "v8",
    status: "success",
    input: payload.caseInput?.trim() ?? "",
    output: "",
    latency: "—",
    tokens: 0,
    user: "—",
  }
}

function buildEmptyForkRunDisplay(_source: RunData): RunData {
  return {
    runId: "—",
    conversationId: "—",
    created: "—",
    origin: "Fork",
    version: "—",
    status: "running",
    input: "",
    output: "",
    latency: "—",
    tokens: 0,
    user: "—",
  }
}

type SaveDatasetItem = { id: string; name: string }

const INITIAL_SAVE_DATASETS: SaveDatasetItem[] = [
  { id: "ds-1", name: "Billing disputes" },
  { id: "ds-2", name: "Technical issues" },
  { id: "ds-3", name: "Account & access" },
]

function SaveToDatasetModal({
  open,
  onOpenChange,
  datasets,
  setDatasets,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  datasets: SaveDatasetItem[]
  setDatasets: React.Dispatch<React.SetStateAction<SaveDatasetItem[]>>
}) {
  const [mode, setMode] = useState<"pick" | "new">("pick")
  const [selectedId, setSelectedId] = useState(datasets[0]?.id ?? "")
  const [newName, setNewName] = useState("")
  const [rowLabel, setRowLabel] = useState<"good" | "fail" | "edge">("good")
  const [notes, setNotes] = useState("")

  const datasetsRef = React.useRef(datasets)
  datasetsRef.current = datasets

  useEffect(() => {
    if (!open) return
    setMode("pick")
    setNewName("")
    setRowLabel("good")
    setNotes("")
    setSelectedId(datasetsRef.current[0]?.id ?? "")
  }, [open])

  const handleSave = () => {
    let targetName: string
    if (mode === "new") {
      const trimmed = newName.trim()
      if (!trimmed) {
        toast.error("Enter a name for the new dataset")
        return
      }
      const id = `ds-${Date.now()}`
      setDatasets((prev) => [...prev, { id, name: trimmed }])
      targetName = trimmed
    } else {
      const ds = datasets.find((d) => d.id === selectedId)
      if (!ds) {
        toast.error("Select a dataset")
        return
      }
      targetName = ds.name
    }
    const labelPretty = rowLabel === "good" ? "Good" : rowLabel === "fail" ? "Fail" : "Edge"
    const noteSuffix = notes.trim() ? ` ${notes.trim()}` : ""
    toast.success("Saved to dataset", {
      description: `Added to "${targetName}" as ${labelPretty}.${noteSuffix ? ` Notes:${noteSuffix}` : ""}`,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 space-y-1.5 border-b border-border/60">
          <DialogTitle>Save Run to dataset</DialogTitle>
          <DialogDescription>
            Choose a dataset or create one, set a label, and add optional notes.
          </DialogDescription>
        </DialogHeader>
        <div className="px-6 py-5 space-y-5">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Dataset</Label>
            <div className="flex items-stretch gap-2 min-w-0">
              {mode === "pick" ? (
                <Select value={selectedId} onValueChange={setSelectedId}>
                  <SelectTrigger size="sm" className="flex-1 min-w-0 w-full min-h-9">
                    <SelectValue placeholder="Select a dataset" />
                  </SelectTrigger>
                  <SelectContent>
                    {datasets.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  className="flex-1 min-w-0 h-9"
                  placeholder="New dataset name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              )}
              <Separator orientation="vertical" className="h-auto shrink-0" />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 gap-1 px-3"
                onClick={() => {
                  setMode((m) => (m === "pick" ? "new" : "pick"))
                  setNewName("")
                }}
              >
                {mode === "pick" ? (
                  <>
                    <Plus className="h-3.5 w-3.5" />
                    New
                  </>
                ) : (
                  "Pick"
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Label</Label>
            <ToggleGroup
              type="single"
              value={rowLabel}
              onValueChange={(v) => {
                if (v) setRowLabel(v as "good" | "fail" | "edge")
              }}
              variant="outline"
              size="sm"
              className="w-full justify-stretch"
            >
              <ToggleGroupItem value="good" className="flex-1">
                Good
              </ToggleGroupItem>
              <ToggleGroupItem value="fail" className="flex-1">
                Fail
              </ToggleGroupItem>
              <ToggleGroupItem value="edge" className="flex-1">
                Edge
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground">Notes (optional)</Label>
            <Textarea
              placeholder="Add context for this row…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[88px] resize-y"
            />
          </div>
        </div>
        <DialogFooter className="px-6 py-4 border-t border-border/60 gap-2 sm:gap-2 sm:justify-end bg-muted/20">
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" size="sm" onClick={handleSave}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Mock: some runs already scored by a configured evaluator; others not evaluated yet */
type RunEvaluationSummary = {
  evaluatorName: string
  score: number
  summary: string
}

/** Label strings for mock run rows — not tied to `INITIAL_EVALUATORS_DEF` order */
const EV_RESPONSE = "Response accuracy"
const EV_TONE = "Tone & empathy"
const EV_RESOLUTION = "Resolution completeness"
const EV_ESCALATION = "Escalation detection rate"

const RUN_EVALUATION_BY_ID: Record<string, RunEvaluationSummary> = {
  "8af162da-6ee4-4bcf-aa7a-99b1f4adf151": {
    evaluatorName: EV_TONE,
    score: 87,
    summary: "Output addresses the question with appropriate tone and structure.",
  },
  "a1b2c3d4-e5f6-7890-abcd-ef1234567890": {
    evaluatorName: EV_RESPONSE,
    score: 72,
    summary: "Summary is mostly correct but omits one key metric from the source.",
  },
  /** Same run as OVERVIEW_SIGNALS sig-1 — score reflects resolution quality; signal = separate policy/KB detector */
  "c3d4e5f6-a7b8-9012-cdef-123456789012": {
    evaluatorName: EV_RESOLUTION,
    score: 48,
    summary:
      "Agent reaches a clear resolution, but the answer relies on a stale policy snippet (60-day window). Live policy is 30 days — aligned with the policy signal, not a contradiction.",
  },
  "d0e1f2a3-b4c5-6789-3456-890123456789": {
    evaluatorName: EV_ESCALATION,
    score: 52,
    summary:
      "The run should have routed to human billing review for a charge older than 30 days, but the agent issued a self-serve refund form instead. The Escalation Router node did not fire despite explicit policy thresholds in the workflow context. Reliability for this evaluator is below the bar you would want for production billing disputes.",
  },
}

/** Selectable presets when the user runs Evaluate from the UI (prototype). */
const EVAL_RUN_PRESET_LIST: {
  id: string
  evaluatorName: string
  /** Short line under the name (e.g. method + what is scored), shown in the select like Experiment eval pickers. */
  subtitle: string
  score: number
  summary: string
}[] = [
  {
    id: "preset-tone",
    evaluatorName: EV_TONE,
    subtitle: "LLM judge · Politeness, empathy, and how clearly the reply reads to the customer",
    score: 82,
    summary:
      "Tone remains professional with appropriate empathy; pacing is clear and the closing aligns with support standards.",
  },
  {
    id: "preset-response",
    evaluatorName: EV_RESPONSE,
    subtitle: "LLM judge · Whether facts, numbers, and claims match the conversation and tool outputs",
    score: 71,
    summary:
      "Factual alignment is strong on billed amounts and dates; one secondary detail in the timeline is slightly misstated compared to the source transcript.",
  },
  {
    id: "preset-resolution",
    evaluatorName: EV_RESOLUTION,
    subtitle: "Rubric · Closure quality—next steps, ownership, and whether the issue is actually resolved",
    score: 65,
    summary:
      "The agent proposes a resolution path and next steps, though follow-ups for edge cases (policy exceptions) are thin.",
  },
  {
    id: "preset-escalation",
    evaluatorName: EV_ESCALATION,
    subtitle: "Policy trace · Escalation thresholds, human handoff, and router decisions vs what the run did",
    score: 52,
    summary:
      "The run should have routed to human billing review for a charge older than 30 days, but the agent issued a self-serve refund form instead. The Escalation Router node did not fire despite explicit policy thresholds in the workflow context. Reliability for this evaluator is below the bar you would want for production billing disputes.",
  },
]

/** Overview "Signals" strip — run IDs must match `runs` for Review run navigation */
const OVERVIEW_SIGNALS = [
  {
    id: "sig-1",
    severity: "high" as const,
    type: "Policy hallucination",
    workflow: "Customer Support Agent",
    variant: "gpt-4o-mini (current)",
    reason: "Agent cited a 60-day refund window. Actual policy is 30 days. KB retrieval returned a stale policy document last updated Dec 2024.",
    runId: "c3d4e5f6-a7b8-9012-cdef-123456789012",
    time: "11:30 AM",
    confidence: 91,
    nodeId: "4",
    causeNodeId: "3",
    causeNodeLabel: "Knowledge Base Lookup",
    recommendation: "Update the KB refund policy document. Add a retrieval confidence threshold — if below 0.85, fall back to the hardcoded policy snippet in the system prompt.",
    actions: [
      { label: "Add to Evaluator", kind: "evaluator" as const },
      { label: "Edit KB Lookup", kind: "workflow" as const },
      { label: "Add guardrail", kind: "guardrail" as const },
      { label: "Review run", kind: "review" as const },
    ],
  },
  {
    id: "sig-2",
    severity: "medium" as const,
    type: "Missed escalation",
    workflow: "Customer Support Agent",
    variant: "gpt-4o-mini (current)",
    reason: "Customer requested a refund for a 90-day-old charge. Policy requires human billing review for charges older than 30 days. Agent sent a self-serve form instead of escalating.",
    runId: "d0e1f2a3-b4c5-6789-3456-890123456789",
    time: "12:05 PM",
    confidence: 87,
    nodeId: "5",
    causeNodeId: "2",
    causeNodeLabel: "Intent Classifier",
    recommendation: "Add a charge_age check to the escalation router: if days_since_charge > 30, route directly to the billing team and skip the self-serve path.",
    actions: [
      { label: "Add to Evaluator", kind: "evaluator" as const },
      { label: "Fix routing rule", kind: "workflow" as const },
      { label: "Review run", kind: "review" as const },
    ],
  },
]

function getOverviewSignalForRun(runId: string) {
  return OVERVIEW_SIGNALS.find((s) => s.runId === runId) ?? null
}

type GuardrailEvent = {
  id: string
  label: string
  node: string
  result: "pass" | "flag" | "block"
}

const RUN_GUARDRAIL_EVENTS: Record<string, GuardrailEvent[]> = {
  "c3d4e5f6-a7b8-9012-cdef-123456789012": [
    { id: "ge-1", label: "PII check", node: "Draft Response", result: "pass" },
    { id: "ge-2", label: "Policy validator", node: "Draft Response", result: "flag" },
    { id: "ge-3", label: "Refund amount check", node: "Escalation Router", result: "pass" },
  ],
  "d0e1f2a3-b4c5-6789-3456-890123456789": [
    { id: "ge-1", label: "PII check", node: "Intent Classifier", result: "pass" },
    { id: "ge-2", label: "Escalation policy", node: "Escalation Router", result: "flag" },
  ],
  "8af162da-6ee4-4bcf-aa7a-99b1f4adf151": [
    { id: "ge-1", label: "PII check", node: "Draft Response", result: "pass" },
    { id: "ge-2", label: "Refund amount check", node: "Escalation Router", result: "pass" },
  ],
}

const SHOW_RUN_SIDEBAR_GUARDRAILS = false

type RunDetailSignal = {
  nodeId: string
  type: string
  severity: "high" | "medium"
  reason: string
  recommendation: string
}

/** Deterministic “failed step” for error runs (matches `varyGanttNodesByRunId` seed style). */
function hashRunId(s: string): number {
  return Math.abs(s.split("").reduce((a, c) => (a << 5) - a + c.charCodeAt(0), 0) | 0)
}

const ERROR_FAIL_NODE_CANDIDATES = ["3", "4", "2", "5", "9-2"] as const

function errorFailNodeIdForRun(runId: string): string {
  return ERROR_FAIL_NODE_CANDIDATES[hashRunId(runId) % ERROR_FAIL_NODE_CANDIDATES.length]!
}

function resolveRunDetailSignal(
  runId: string | null,
  run: RunData | null | undefined,
  isForkDraft: boolean,
): RunDetailSignal | null {
  if (!runId || isForkDraft || !run) return null
  const overviewSig = getOverviewSignalForRun(runId)
  if (overviewSig) {
    return {
      nodeId: overviewSig.nodeId,
      type: overviewSig.type,
      severity: overviewSig.severity,
      reason: overviewSig.reason,
      recommendation: overviewSig.recommendation,
    }
  }
  if (run.status === "error") {
    return {
      nodeId: errorFailNodeIdForRun(run.runId),
      type: "Workflow error",
      severity: "high",
      reason: run.output?.trim() || "The workflow did not complete successfully.",
      recommendation:
        "Inspect the highlighted step’s inputs and downstream dependencies (timeouts, auth, rate limits). Retry when services are healthy, or add retries and idempotency for lookups that failed.",
    }
  }
  return null
}

function SignalInsightCard({
  signal,
  onFixWithAi,
  containerClassName,
}: {
  signal: Pick<RunDetailSignal, "type" | "severity" | "reason">
  onFixWithAi?: () => void
  /** e.g. aside strip uses horizontal inset; General tab is full width inside `px-4`. */
  containerClassName?: string
}) {
  const isHigh = signal.severity === "high"
  return (
    <Alert
      className={cn(
        "shrink-0 rounded-xl py-3.5 shadow-none",
        isHigh
          ? "border-destructive/40 bg-destructive/5 text-destructive [&>svg]:text-destructive *:data-[slot=alert-description]:text-destructive/85"
          : "border-amber-500/35 bg-amber-50 text-amber-950 dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-50 [&>svg]:text-amber-600 dark:[&>svg]:text-amber-400 *:data-[slot=alert-description]:text-amber-900/80 dark:*:data-[slot=alert-description]:text-amber-100/85",
        containerClassName ?? "mx-4 mt-3 mb-0"
      )}
    >
      <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden />
      <AlertTitle className="line-clamp-none flex flex-wrap items-center gap-2 text-sm font-semibold leading-tight text-current">
        {signal.type}
        <span
          className={cn(
            "inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
            isHigh
              ? "bg-destructive/15 text-destructive dark:text-destructive"
              : "bg-amber-500/15 text-amber-800 dark:text-amber-200"
          )}
        >
          {signal.severity}
        </span>
      </AlertTitle>
      <AlertDescription className="flex flex-col gap-2 text-xs leading-relaxed">
        <p>{signal.reason}</p>
        <div className="flex justify-end pt-0.5">
          <Button
            size="sm"
            variant={isHigh ? "destructive" : "secondary"}
            className={cn(
              "h-8 w-fit gap-1.5 px-3 text-xs font-medium shadow-none",
              !isHigh &&
                "border-amber-200/80 bg-amber-100/80 text-amber-950 hover:bg-amber-100 dark:border-amber-700/50 dark:bg-amber-900/50 dark:text-amber-50 dark:hover:bg-amber-900/70"
            )}
            onClick={() => {
              if (onFixWithAi) onFixWithAi()
              else
                toast.message("Fix with AI", {
                  description: "This prototype would open the AI assistant with this signal and run context.",
                })
            }}
          >
            <Bot className="h-3.5 w-3.5 opacity-80" />
            Fix with AI
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  )
}

/** Same 0–100 internal scale as evaluator `ScoreChip` / `EvalGradingRow` (display = score / 10). */
function formatRunEvalScoreTenPoint(score: number) {
  return (score / 10).toFixed(1)
}

/** Mirrors `EvalGradingRow` in `evaluator.tsx` for run-detail General sidebar. */
function RunDetailEvalGradingRow({
  evalLabel,
  score,
  summary,
}: {
  evalLabel: string
  score: number
  summary: string
}) {
  const [expanded, setExpanded] = React.useState(false)
  const full = "Score " + formatRunEvalScoreTenPoint(score) + "/10 \u2014 " + summary
  const truncated = full.length > 180 ? full.slice(0, 180) + "\u2026" : full
  const hasMore = full.length > 180
  const showToggle = hasMore || expanded
  const threshold = EVALUATOR_PASS_THRESHOLDS[evalLabel]
  const pass = threshold == null || score >= threshold
  const wrapCls =
    "flex flex-col gap-1 rounded-lg border border-border/70 bg-muted/40 p-2 dark:border-border dark:bg-muted/30"
  const chipCls = pass
    ? "inline-flex w-fit shrink-0 items-center rounded px-1 py-0.5 tabular-nums text-[11px] font-semibold leading-none bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
    : "inline-flex w-fit shrink-0 items-center rounded px-1 py-0.5 tabular-nums text-[11px] font-semibold leading-none bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400"
  return (
    <div className={wrapCls}>
      <div className="flex min-w-0 flex-row flex-wrap items-center gap-2">
        <span className={chipCls}>
          {formatRunEvalScoreTenPoint(score)}
        </span>
        <span className="min-w-0 text-[11px] font-medium leading-tight text-foreground">{evalLabel}</span>
      </div>
      <div className="flex min-w-0 items-start gap-1">
        <p className={cn("min-w-0 flex-1 text-[12px] leading-snug text-muted-foreground", !expanded && "line-clamp-2")}>
          {expanded ? full : truncated}
        </p>
        {showToggle ? (
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="shrink-0 rounded-sm p-0.5 text-muted-foreground/60 transition-colors hover:bg-muted/60 hover:text-foreground"
            aria-label={expanded ? "Show less" : "Show more"}
          >
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-180")} />
          </button>
        ) : null}
      </div>
    </div>
  )
}

const OVERVIEW_CLUSTERS = [
  {
    id: "clu-1",
    severity: "high" as const,
    label: "Incorrect refund eligibility assessment",
    workflow: "Customer Support Agent",
    affectedRuns: 18,
    timeWindow: "48h",
    trend: "+11 since prompt update v7",
    firstSeen: "Apr 14, 11:24 AM",
    lastSeen: "11 min ago",
    failureMode: "Agent tells customers they are eligible for refunds outside the 30-day window, citing a stale or hallucinated policy that states 60 days.",
    suspectedCause: "The KB refund policy document was not updated when the policy changed from 60 to 30 days in Q1 2026. The Draft Response node retrieves this stale doc and uses it as ground truth.",
    suggestion: "Update the KB refund policy document immediately. Add a prompt guardrail: 'Refund window is strictly 30 days — do not approve requests beyond this without escalating to the billing team.' Promote the failing example to the Billing disputes eval dataset.",
    affectedVariants: ["gpt-4o-mini (current)", "gpt-4.1"],
    examples: [
      { runId: "c3d4e5f6-a7b8-9012-cdef-123456789012", input: "I want a refund for the last 3 months — I barely used the product.", output: "Our refund policy covers requests made within 60 days of the charge. I can process a refund for your most recent charge.", expected: '{"intent":"refund_request","action":"escalate_to_billing","reason":"outside_30_day_window","refund_eligible":false}' },
      { runId: "9a1b2c3d-4e5f-6789-abcd-ef0123456789", input: "I was charged 45 days ago and want that money back.", output: "You're within our refund window. Let me process that for you now.", expected: '{"intent":"refund_request","action":"escalate_to_billing","reason":"outside_30_day_window"}' },
      { runId: "1b2c3d4e-5f6a-7890-bcde-f01234567890", input: "Can I get a refund for a charge from 6 weeks ago?", output: "Our policy allows up to 60 days — you're still eligible. I'll initiate the refund now.", expected: '{"intent":"refund_request","action":"escalate_to_billing","reason":"outside_30_day_window"}' },
    ],
    anchorRunId: "c3d4e5f6-a7b8-9012-cdef-123456789012",
  },
  {
    id: "clu-2",
    severity: "medium" as const,
    label: "Incomplete cancellation confirmation",
    workflow: "Customer Support Agent",
    affectedRuns: 11,
    timeWindow: "24h",
    trend: "+4 since yesterday",
    firstSeen: "Apr 16, 9:02 AM",
    lastSeen: "2 hrs ago",
    failureMode: "Agent gives cancellation instructions but does not confirm whether the account was cancelled or offer to complete it directly on behalf of the customer.",
    suspectedCause: "System prompt instructs the agent to 'guide users through self-service steps.' For cancellation requests, this results in step-by-step instructions being sent without the agent confirming the action or offering to execute it.",
    suggestion: "Update the cancellation handler: when a user explicitly says 'cancel my account', the agent should confirm the cancellation immediately and send a confirmation, rather than redirecting to Settings. Add this as an eval test case.",
    affectedVariants: ["gpt-4o-mini (current)"],
    examples: [
      { runId: "b2c3d4e5-f6a7-8901-bcde-f12345678901", input: "How do I cancel my subscription?", output: "To cancel, go to Settings → Billing → Cancel Plan. You'll retain access until the end of your period.", expected: "I can process the cancellation for you directly, or walk you through it — which would you prefer? If you'd like me to cancel it now, just confirm and I'll take care of it." },
      { runId: "d4e5f6a7-b8c9-0123-def0-234567890123", input: "Cancel my account — I'm switching to a competitor.", output: "I understand. To cancel, go to Settings → Billing → Cancel Plan.", expected: "Done — I've cancelled your account. You'll receive a confirmation email shortly and retain access until the end of your billing period. Is there anything else I can help with?" },
    ],
    anchorRunId: "b2c3d4e5-f6a7-8901-bcde-f12345678901",
  },
]

/** Clusters tab: same grid as Evaluators-style table rows */
const CLUSTER_TABLE_COL =
  "grid grid-cols-[minmax(200px,1.65fr)_minmax(100px,0.55fr)_minmax(220px,1.5fr)_minmax(200px,1.15fr)_minmax(88px,0.5fr)_40px] gap-4 items-center"

// Predecessors/successors for Context tab (multiple inputs and outputs per node)
function getNodeContext(node: GanttNode | null, nodes: GanttNode[] = GANTT_NODES): { inputFrom: GanttNode[]; outputTo: GanttNode[] } {
  if (!node) return { inputFrom: [], outputTo: [] }
  const candidatesIn = nodes
    .filter((n) => n.id !== node.id && n.endSec <= node.startSec)
    .sort((a, b) => b.endSec - a.endSec)
    .slice(0, 3)
  const candidatesOut = nodes
    .filter((n) => n.id !== node.id && n.startSec >= node.endSec)
    .sort((a, b) => a.startSec - b.startSec)
    .slice(0, 3)
  return { inputFrom: candidatesIn, outputTo: candidatesOut }
}

// Per-node input/output for Run Details sidebar (different text per node)
function getNodeInputOutput(node: { id: string; label: string } | null): { input: string; output: string } {
  if (!node) return { input: "—", output: "—" }
  const byId: Record<string, { input: string; output: string }> = {
    "1-email": { input: "Source: email\nFrom: sarah.chen@example.com\nSubject: Charged after cancellation\nBody: I cancelled my account 3 weeks ago but was just charged $299.", output: "Inbound message accepted. Routing to Email Preprocessing." },
    "1-chat": { input: "Widget session ws_8f2a…\nUser: \"I was charged twice for my Pro subscription this month. This is the third time I've reached out with no response.\"", output: "Chat transcript captured. Routing to Intent Classifier." },
    "2":   { input: "Customer message: 'I cancelled my account 3 weeks ago but was just charged $299.'\nSource: email\nUser: sarah.chen@example.com", output: '{"intent":"billing_dispute","priority":"high","sentiment":"frustrated","confidence":0.97}' },
    "3":   { input: "Query: billing dispute refund cancelled account\nTop-k: 5", output: "Retrieved 2 documents: 'Refund Policy (30 days)', 'Post-cancellation Billing FAQ'. Confidence: 0.93." },
    "4":   { input: "Intent: billing_dispute | Priority: high | KB docs: Refund Policy, Post-cancellation FAQ\nCustomer: 'I cancelled 3 weeks ago but was charged $299.'", output: "Hi Sarah, I'm really sorry about this — a charge after cancellation should never happen. I've confirmed your cancellation on March 25th and initiated a full refund of $299. It will appear within 3–5 business days." },
    "5":   { input: "Priority: high | Charge age: 21 days | Intent: billing_dispute\nEscalation threshold: charge_age > 30 OR priority = critical", output: "Escalation: not required. Routing to Send Reply." },
    "6":   { input: "To: sarah.chen@example.com\nSubject: Re: Charged after cancellation\nBody: [Drafted reply from AI Agent]", output: "Email sent successfully. Message ID: msg_tkt20481_reply." },
    "7":   { input: "Condition: refund_initiated = true. Branch evaluation.", output: "True branch taken — logging refund event to CRM." },
    "8":   { input: "Ticket TKT-20481 | Status: resolved | Action: refund_initiated | Customer: sarah.chen@example.com", output: "CRM updated. Resolution: refund_initiated. Ticket closed." },
    "9":   { input: "Raw email payload from inbox connector.", output: "Preprocessing complete. 3 sub-nodes executed." },
    "9-1": { input: "Raw email headers: From, Subject, Date, Message-ID.", output: "Parsed: sender=sarah.chen@example.com, subject=Charged after cancellation, ticket_id=TKT-20481." },
    "9-2": { input: "Email body: 'I cancelled my account 3 weeks ago but was just charged $299.'", output: '{"intent":"billing_dispute","sentiment":"frustrated","urgency":"high"}' },
    "9-3": { input: "Parsed intent + ticket_id TKT-20481.", output: "Ticket TKT-20481 created and attached to customer account. Assigned to support queue." },
    "10":  { input: "Run result: success | Reply sent | CRM updated.", output: "Run completed. Total latency: 2.31s. Tokens: 184." },
  }
  return byId[node.id] ?? { input: `Input for ${node.label}.`, output: `Output for ${node.label}.` }
}

// AI Agent–specific tab content (input, tools, completion) per instance. Tools is JSON string (tool calls only).
function getAiAgentTabContent(nodeId: string): { input: string; tools: string; completion: string } {
  const toolsPayloads: Record<string, string> = {
    "2": JSON.stringify({
      subflow_tools: [
        { name: "classify_intent", args: { message: "I cancelled my account 3 weeks ago but was just charged $299.", source: "email" } },
      ],
      mcp_server_calls: [],
    }),
    "4": JSON.stringify({
      subflow_tools: [
        { name: "search_kb", args: { query: "refund policy cancelled account charge", top_k: 5 } },
        { name: "check_ticket_history", args: { user_email: "sarah.chen@example.com", limit: 5 } },
      ],
      mcp_server_calls: [
        { server: "billing-api", method: "getChargeHistory", params: { email: "sarah.chen@example.com", days: 30 } },
      ],
    }),
    "9-2": JSON.stringify({
      subflow_tools: [
        { name: "classify_intent", args: { message: "I cancelled my account 3 weeks ago but was just charged $299.", format: "structured" } },
      ],
      mcp_server_calls: [],
    }),
  }
  const byId: Record<string, { input: string; tools: string; completion: string }> = {
    "2": {
      input: "Customer message: \"I cancelled my account 3 weeks ago but was just charged $299.\"\nSource: email | User: sarah.chen@example.com",
      tools: toolsPayloads["2"],
      completion: '{"intent":"billing_dispute","priority":"high","sentiment":"frustrated","confidence":0.97}\n\nClassification complete. Routing to Knowledge Base Lookup.',
    },
    "4": {
      input: "Intent: billing_dispute | Priority: high\nKB docs: Refund Policy (30 days), Post-cancellation Billing FAQ\nBilling API: last charge $299 on Apr 14 — account cancelled Mar 25.\nCustomer message: \"I cancelled my account 3 weeks ago but was just charged $299.\"",
      tools: toolsPayloads["4"],
      completion: "Hi Sarah,\n\nI'm really sorry about this — a charge after cancellation should never happen and I completely understand your frustration.\n\nI've confirmed that your account was cancelled on **March 25th**, and the $299 charge on **April 14th** was applied in error. I've initiated a **full refund** to your original payment method — it should appear within **3–5 business days**.\n\nYou'll receive a confirmation email shortly. Again, I sincerely apologize for the inconvenience.\n\nBest,\nSupport Team",
    },
    "9-2": {
      input: "Email body: \"I cancelled my account 3 weeks ago but was just charged $299.\"",
      tools: toolsPayloads["9-2"],
      completion: '{"intent":"billing_dispute","sentiment":"frustrated","urgency":"high"}\n\nIntent extracted. Attaching to ticket TKT-20481.',
    },
  }
  const defaultTools = JSON.stringify({
    subflow_tools: [],
    mcp_server_calls: [],
  })
  return byId[nodeId] ?? {
    input: "Input for AI Agent.",
    tools: defaultTools,
    completion: "Response generated successfully.",
  }
}

type ForkStepEdit = { key: string; nodeId: string; values: Record<string, string> }

interface AnalyticsProps {
  onSwitchToWorkflow?: () => void
  /** Opens Ask AI / fix assistant (e.g. from signal banner). */
  onFixWithAi?: () => void
  /** From layout: open fork draft once for this source run (Run progress / global Fork). */
  pendingForkFromRun?: { runId: string; caseInput?: string } | null
  onPendingForkConsumed?: () => void
  /** From layout / Experiment: focus Run Details for this run id once it exists in `runs`. */
  pendingOpenRunId?: string | null
  onPendingOpenRunConsumed?: () => void
  /** Run progress ⋯ Evaluate Run: open picker once Analytics is active. */
  pendingEvaluateRunId?: string | null
  onPendingEvaluateRunConsumed?: () => void
  /** Workflow + evaluator runs (layout-owned so Experiment / Fork can append). */
  runs: RunData[]
  onAppendRun: (run: RunData) => void
}

export function Analytics({
  onSwitchToWorkflow,
  onFixWithAi,
  pendingForkFromRun = null,
  onPendingForkConsumed,
  pendingOpenRunId = null,
  onPendingOpenRunConsumed,
  pendingEvaluateRunId = null,
  onPendingEvaluateRunConsumed,
  runs,
  onAppendRun,
}: AnalyticsProps) {
  const tabContext = React.useContext(TabContext)
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(2026, 3, 14), // Apr 14, 2026
    to: new Date(2026, 3, 17)   // Apr 17, 2026
  })
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null)
  const [selectedGanttNode, setSelectedGanttNode] = useState<GanttNode | null>(null)
  const [hoveredContextNodeId, setHoveredContextNodeId] = useState<string | null>(null)
  const [sidebarShowGeneral, setSidebarShowGeneral] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [completionModalOpen, setCompletionModalOpen] = useState(false)
  const [outputModalOpen, setOutputModalOpen] = useState(false)
  const [outputViewMode, setOutputViewMode] = useState<"text" | "formatted">("formatted")
  const [saveToDatasetOpen, setSaveToDatasetOpen] = useState(false)
  const [saveDatasets, setSaveDatasets] = useState<SaveDatasetItem[]>(INITIAL_SAVE_DATASETS)
  const [forkSourceRun, setForkSourceRun] = useState<RunData | null>(null)
  const [forkDrawerOpen, setForkDrawerOpen] = useState(false)
  const [forkSteps, setForkSteps] = useState<ForkStepEdit[]>([])
  const [forkAddQuery, setForkAddQuery] = useState("")
  const [forkAddPopoverOpen, setForkAddPopoverOpen] = useState(false)
  const [forkRunPhase, setForkRunPhase] = useState<"draft" | "running" | "complete">("draft")
  const [forkRunStartTime, setForkRunStartTime] = useState<number | null>(null)
  const forkRunCompleteTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const onAppendRunRef = React.useRef(onAppendRun)
  onAppendRunRef.current = onAppendRun
  const runsRef = React.useRef(runs)
  runsRef.current = runs
  const [applyWorkflowDraftModalOpen, setApplyWorkflowDraftModalOpen] = useState(false)
  const [evaluateRunDialogOpen, setEvaluateRunDialogOpen] = useState(false)
  const [evaluateRunTargetId, setEvaluateRunTargetId] = useState<string | null>(null)
  const [evaluatePresetId, setEvaluatePresetId] = useState<string>(EVAL_RUN_PRESET_LIST[0]!.id)
  const [evaluateRunBusy, setEvaluateRunBusy] = useState(false)
  const [evalOverridesByRunId, setEvalOverridesByRunId] = useState<Record<string, RunEvaluationSummary>>({})

  const openEvaluateRunDialog = React.useCallback((runId: string) => {
    setEvaluateRunTargetId(runId)
    setEvaluatePresetId(EVAL_RUN_PRESET_LIST[0]!.id)
    setEvaluateRunDialogOpen(true)
  }, [])

  const confirmEvaluateRun = React.useCallback(() => {
    if (!evaluateRunTargetId || evaluateRunBusy) return
    const preset = EVAL_RUN_PRESET_LIST.find((p) => p.id === evaluatePresetId)
    if (!preset) return
    setEvaluateRunBusy(true)
    const targetId = evaluateRunTargetId
    window.setTimeout(() => {
      setEvalOverridesByRunId((prev) => ({
        ...prev,
        [targetId]: {
          evaluatorName: preset.evaluatorName,
          score: preset.score,
          summary: preset.summary,
        },
      }))
      setSelectedRunId(targetId)
      setEvaluateRunBusy(false)
      setEvaluateRunDialogOpen(false)
      setEvaluateRunTargetId(null)
      toast.success("Evaluation complete", {
        description: `${preset.evaluatorName}: ${(preset.score / 10).toFixed(1)}/10 — results are in the Evaluation section of the run panel.`,
      })
    }, 950)
  }, [evaluateRunTargetId, evaluatePresetId, evaluateRunBusy])

  const addForkStep = React.useCallback((nodeId: string) => {
    setForkSteps((prev) => [
      ...prev,
      {
        key: `fork-step-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        nodeId,
        values: defaultValuesForNode(nodeId),
      },
    ])
    setForkAddQuery("")
    setForkAddPopoverOpen(false)
  }, [])

  const removeForkStep = React.useCallback((key: string) => {
    setForkSteps((prev) => prev.filter((s) => s.key !== key))
  }, [])

  const updateForkStepValue = React.useCallback((key: string, fieldKey: string, value: string) => {
    setForkSteps((prev) =>
      prev.map((s) => (s.key === key ? { ...s, values: { ...s.values, [fieldKey]: value } } : s)),
    )
  }, [])

  /** Reset fork edits — used when the fork sheet first opens or is reopened from the UI. */
  const openForkSheetFresh = React.useCallback(() => {
    setForkSteps([])
    setForkAddQuery("")
    setForkAddPopoverOpen(false)
    setForkDrawerOpen(true)
  }, [])

  const forkAddCandidates = useMemo(() => {
    const taken = new Set(forkSteps.map((s) => s.nodeId))
    const q = forkAddQuery.trim().toLowerCase()
    return WORKFLOW_NODES.filter((n) => !taken.has(n.id)).filter(
      (n) => q === "" || n.label.toLowerCase().includes(q) || n.id.toLowerCase().includes(q),
    )
  }, [forkSteps, forkAddQuery])

  const clearForkRunTimer = React.useCallback(() => {
    if (forkRunCompleteTimerRef.current != null) {
      clearTimeout(forkRunCompleteTimerRef.current)
      forkRunCompleteTimerRef.current = null
    }
  }, [])

  useEffect(() => () => clearForkRunTimer(), [clearForkRunTimer])

  useEffect(() => {
    if (!pendingForkFromRun) return
    const source = resolveForkSourceRun(pendingForkFromRun, runsRef.current)
    clearForkRunTimer()
    setForkSourceRun(source)
    setForkRunPhase("draft")
    setForkRunStartTime(null)
    setSelectedRunId(FORK_DRAFT_RUN_ID)
    setSelectedGanttNode(null)
    openForkSheetFresh()
    onPendingForkConsumed?.()
  }, [pendingForkFromRun, onPendingForkConsumed, clearForkRunTimer, openForkSheetFresh])

  // Run progress "Inspect Run" / Experiment cell sheet: open Run Details for a specific run id
  useEffect(() => {
    if (!pendingOpenRunId) return
    const exists = runs.some((r) => r.runId === pendingOpenRunId)
    const targetId = exists ? pendingOpenRunId : runs[0]?.runId ?? null
    if (targetId) {
      clearForkRunTimer()
      setForkRunPhase("draft")
      setForkRunStartTime(null)
      setForkSourceRun(null)
      setForkDrawerOpen(false)
      setSelectedRunId(targetId)
      setSelectedGanttNode(null)
    }
    onPendingOpenRunConsumed?.()
  }, [pendingOpenRunId, runs, onPendingOpenRunConsumed, clearForkRunTimer])

  useEffect(() => {
    if (!pendingEvaluateRunId) return
    openEvaluateRunDialog(pendingEvaluateRunId)
    onPendingEvaluateRunConsumed?.()
  }, [pendingEvaluateRunId, onPendingEvaluateRunConsumed, openEvaluateRunDialog])

  // When landing on run detail, show General in sidebar and no node selected (signal + recommendation live there)
  useEffect(() => {
    if (selectedRunId) {
      setSelectedGanttNode(null)
      setSidebarShowGeneral(true)
      setSidebarOpen(true)
    }
  }, [selectedRunId])

  // When switching selected node, show node-specific view and open sidebar if closed
  useEffect(() => {
    if (selectedGanttNode?.id) {
      setSidebarShowGeneral(false)
      setSidebarOpen(true)
    }
  }, [selectedGanttNode?.id])

  useEffect(() => {
    setSaveToDatasetOpen(false)
  }, [selectedRunId])

  // Close completion modal on Escape
  useEffect(() => {
    if (!completionModalOpen && !outputModalOpen) return
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setCompletionModalOpen(false)
        setOutputModalOpen(false)
      }
    }
    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [completionModalOpen, outputModalOpen])

  const [activeMetric, setActiveMetric] = useState("Runs")
  const [tokenView, setTokenView] = useState<"total" | "input" | "output">("total")
  const [analyticsTab, setAnalyticsTab] = useState("overview")
  const [selectedClusterId, setSelectedClusterId] = useState<string | null>(null)
  /** Overview runs table: Evaluator column on by default */
  const [overviewShowEvaluatorColumn, setOverviewShowEvaluatorColumn] = useState(true)
  const [selectedConversationId, setSelectedConversationId] = useState(mockConversations[0]?.id ?? "")
  const [conversationSearch, setConversationSearch] = useState("")

  const filteredConversations = useMemo(() => {
    const q = conversationSearch.trim().toLowerCase()
    if (!q) return mockConversations
    return mockConversations.filter((c) => c.listLabel.toLowerCase().includes(q))
  }, [conversationSearch])

  const handleCompareClick = React.useCallback((node: GanttNode) => {
    toast.message("Compare", { description: "Compare this agent step across runs." })
  }, [])

  const selectedConversation = mockConversations.find((c) => c.id === selectedConversationId) ?? mockConversations[0]

  const metrics = useMemo(() => {
    const CHART_DATES = ["Apr 5","Apr 10","Apr 15","Apr 20","Apr 25","Apr 30","May 5","May 10","May 15","May 20","May 25","May 30","Jun 4","Jun 9","Jun 14","Jun 19","Jun 24","Jun 30"]
    const tokenRows = CHART_DATES.map((date, i) => {
      const total = Math.round(5000 + i * 65000 + Math.sin(i * 0.7) * 8000)
      const input = Math.round(total * 0.38)
      const output = total - input
      return { date, total, input, output }
    })
    return [
      {
        title: "Runs",
        value: "3,023",
        data: CHART_DATES.map((date, i) => ({ date, value: Math.round(50 + i * 160 + Math.sin(i) * 30) })),
      },
      {
        title: "Users",
        value: "123",
        data: CHART_DATES.map((date, i) => ({ date, value: Math.round(5 + i * 6 + Math.cos(i * 0.8) * 3) })),
      },
      {
        title: "Errors",
        value: "12",
        data: CHART_DATES.map((date, i) => ({ date, value: Math.round(Math.max(0, 3 - i * 0.1 + Math.sin(i * 1.5) * 2)) })),
      },
      {
        title: "Signal Alerts",
        value: "847",
        data: CHART_DATES.map((date, i) => ({ date, value: Math.round(20 + i * 45 + Math.sin(i * 0.5) * 15) })),
      },
      {
        title: "Evaluation",
        value: "85%",
        data: CHART_DATES.map((date, i) => ({ date, value: Math.round(60 + i * 1.4 + Math.sin(i) * 5) })),
      },
      {
        title: "Tokens",
        value: "1,234,214",
        data: tokenRows.map(({ date, total }) => ({ date, value: total })),
        tokenBreakdown: {
          total: {
            value: "1,234,214",
            data: tokenRows.map(({ date, total }) => ({ date, value: total })),
          },
          input: {
            value: "468,999",
            data: tokenRows.map(({ date, input }) => ({ date, value: input })),
          },
          output: {
            value: "765,215",
            data: tokenRows.map(({ date, output }) => ({ date, value: output })),
          },
        },
      },
    ]
  }, [])

  const activeMetricData = useMemo(() => {
    const m = metrics.find((x) => x.title === activeMetric) ?? metrics[0]
    if (m.title === "Tokens" && "tokenBreakdown" in m && m.tokenBreakdown) {
      const b = m.tokenBreakdown[tokenView]
      return { title: m.title, value: b.value, data: b.data }
    }
    return { title: m.title, value: m.value, data: m.data }
  }, [activeMetric, tokenView, metrics])

  // Run-specific Gantt data so Previous/Next run show different bar timings.
  // When the run is success, show all nodes as success (no error node in this run).
  const runGanttNodes = useMemo(() => {
    const nodes = varyGanttNodesByRunId(selectedRunId ?? "", GANTT_NODES)
    const run = runs.find((r) => r.runId === selectedRunId)
    if (run?.status === "success") {
      return nodes.map((n) => ({ ...n, status: "success" as const }))
    }
    if (run?.status === "error") {
      const failId = errorFailNodeIdForRun(run.runId)
      return nodes.map((n) =>
        n.id === failId ? { ...n, status: "error" as const } : { ...n, status: "success" as const }
      )
    }
    return nodes
  }, [selectedRunId, runs])

  const forkReplayGanttNodes = useMemo(() => {
    if (!forkSourceRun) return GANTT_NODES
    return varyGanttNodesByRunId(`fork-replay:${forkSourceRun.runId}`, GANTT_NODES).map((n) => ({
      ...n,
      status: "success" as const,
    }))
  }, [forkSourceRun])

  const forkCompletedGanttNodes = useMemo(() => {
    if (!forkSourceRun) return GANTT_NODES
    const nodes = varyGanttNodesByRunId(forkSourceRun.runId, GANTT_NODES)
    return nodes.map((n) => ({ ...n, status: "success" as const }))
  }, [forkSourceRun])

  const activeRunDetailGanttNodes = useMemo(() => {
    if (selectedRunId !== FORK_DRAFT_RUN_ID || !forkSourceRun) return runGanttNodes
    if (forkRunPhase === "running") return forkReplayGanttNodes
    if (forkRunPhase === "complete") return forkCompletedGanttNodes
    return runGanttNodes
  }, [selectedRunId, forkSourceRun, forkRunPhase, runGanttNodes, forkReplayGanttNodes, forkCompletedGanttNodes])

  // Runs ordered newest first (for table and for Previous = older, Next = more recent)
  const runsNewestFirst = useMemo(() => [...runs].reverse(), [runs])

  /** Overview table: omit in-progress runs (no "Running" row in the list) */
  const runsForOverviewTable = useMemo(
    () => runsNewestFirst.filter((r) => r.status !== "running"),
    [runsNewestFirst]
  )

  const overviewSignalsHighCount = useMemo(
    () => OVERVIEW_SIGNALS.filter((s) => s.severity === "high").length,
    []
  )

  const overviewClustersHighCount = useMemo(
    () => OVERVIEW_CLUSTERS.filter((c) => c.severity === "high").length,
    []
  )

  const overviewSignalRows = useMemo(
    () =>
      OVERVIEW_SIGNALS.map((s) => ({
        id: s.id,
        severity: s.severity,
        name: s.type,
        description: s.reason,
        nodeId: s.nodeId,
        recommendation: s.recommendation,
        meta: `${s.runId.slice(0, 8)}… · ${s.time}`,
        cta: "Review run",
        runId: s.runId,
        causeNodeLabel: s.causeNodeLabel,
        actions: s.actions,
      })),
    []
  )

  const overviewClusterRows = useMemo(
    () =>
      OVERVIEW_CLUSTERS.map((c) => ({
        id: c.id,
        severity: c.severity,
        name: c.label,
        description: c.failureMode,
        meta: `${c.affectedRuns} runs · last ${c.timeWindow}`,
        cta: "Open cluster",
        why: c.suspectedCause.split(".")[0] + ".",
      })),
    []
  )

  // Run detail subpage with main content + sidebar (including empty fork draft)
  const isForkDraftView = selectedRunId === FORK_DRAFT_RUN_ID && forkSourceRun != null
  const forkPanelRun = useMemo((): RunData | null => {
    if (!isForkDraftView || !forkSourceRun) return null
    const base = buildEmptyForkRunDisplay(forkSourceRun)
    const forkRunId = `${forkSourceRun.runId.slice(0, 8)}…fork`
    if (forkRunPhase === "draft") return base
    if (forkRunPhase === "running") {
      return {
        ...base,
        runId: forkRunId,
        status: "running",
        latency: "—",
        version: forkSourceRun.version,
        input: forkSourceRun.input,
        output: "",
        tokens: 0,
      }
    }
    return {
      ...base,
      runId: forkRunId,
      status: "success",
      conversationId: forkSourceRun.conversationId,
      created: forkSourceRun.created,
      origin: "Fork",
      version: forkSourceRun.version,
      input: forkSourceRun.input,
      output: forkSourceRun.output,
      latency: "2.04s",
      tokens: Math.max(8, forkSourceRun.tokens - 7),
      user: forkSourceRun.user,
    }
  }, [isForkDraftView, forkSourceRun, forkRunPhase])

  const selectedRun = isForkDraftView && forkPanelRun
    ? forkPanelRun
    : runs.find((r) => r.runId === selectedRunId)
  const runEvaluation =
    selectedRunId && !isForkDraftView
      ? (evalOverridesByRunId[selectedRunId] ?? RUN_EVALUATION_BY_ID[selectedRunId])
      : undefined

  const selectedEvaluatePreset =
    EVAL_RUN_PRESET_LIST.find((p) => p.id === evaluatePresetId) ?? EVAL_RUN_PRESET_LIST[0]!

  const evaluateRunDialog = (
    <Dialog
      open={evaluateRunDialogOpen}
      onOpenChange={(open) => {
        if (!open && evaluateRunBusy) return
        setEvaluateRunDialogOpen(open)
        if (!open) setEvaluateRunTargetId(null)
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Evaluate run</DialogTitle>
          <DialogDescription>
            Pick an evaluator, run it against this run, and see the score in the run sidebar under Evaluation.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-1">
          <Label htmlFor="evaluate-preset" className="text-sm text-muted-foreground">
            Evaluator
          </Label>
          <Select
            value={evaluatePresetId}
            onValueChange={setEvaluatePresetId}
            disabled={evaluateRunBusy}
          >
            <SelectTrigger
              id="evaluate-preset"
              className="h-auto min-h-10 w-full items-start gap-3 whitespace-normal py-3 data-[size=default]:h-auto [&>svg]:mt-0.5 [&>svg]:shrink-0 [&_[data-slot=select-value]]:line-clamp-none [&_[data-slot=select-value]]:min-h-0 [&_[data-slot=select-value]]:w-full [&_[data-slot=select-value]]:flex-1 [&_[data-slot=select-value]]:items-start [&_[data-slot=select-value]]:self-stretch"
            >
              <SelectValue placeholder="Select evaluator">
                <span className="flex min-w-0 flex-col items-start gap-0.5 text-left">
                  <span className="text-sm font-medium leading-snug text-foreground">
                    {selectedEvaluatePreset.evaluatorName}
                  </span>
                  <span className="text-xs font-normal leading-tight text-muted-foreground">
                    {selectedEvaluatePreset.subtitle}
                  </span>
                </span>
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="max-w-[min(100vw-2rem,26rem)]">
              {EVAL_RUN_PRESET_LIST.map((p) => (
                <SelectItem key={p.id} value={p.id} className="items-start py-2.5">
                  <span className="flex min-w-0 flex-col gap-0.5 pr-6 text-left">
                    <span className="text-sm font-medium leading-snug">{p.evaluatorName}</span>
                    <span className="text-xs font-normal leading-tight text-muted-foreground">
                      {p.subtitle}
                    </span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setEvaluateRunDialogOpen(false)}
            disabled={evaluateRunBusy}
          >
            Cancel
          </Button>
          <Button type="button" size="sm" onClick={confirmEvaluateRun} disabled={evaluateRunBusy}>
            {evaluateRunBusy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                Running…
              </>
            ) : (
              "Run evaluation"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
  const resolvedRunSignal = useMemo(
    () => resolveRunDetailSignal(selectedRunId, selectedRun ?? null, isForkDraftView),
    [selectedRunId, selectedRun, isForkDraftView]
  )
  const ganttSignalNodeId =
    resolvedRunSignal?.nodeId && resolvedRunSignal.nodeId.length > 0 ? resolvedRunSignal.nodeId : null

  const ganttRootCauseNodeId = useMemo(() => {
    if (!selectedRunId || isForkDraftView) return null
    const overviewSig = OVERVIEW_SIGNALS.find((s) => s.runId === selectedRunId)
    if (overviewSig?.causeNodeId) return overviewSig.causeNodeId
    const run = runs.find((r) => r.runId === selectedRunId)
    return run?.nodeScores?.find((n) => n.rootCause)?.nodeId ?? null
  }, [selectedRunId, isForkDraftView, runs])
  if (selectedRunId && selectedRun) {
    return (
      <>
      <div className="flex h-full bg-background overflow-hidden">
        {/* Left: main content */}
        <div className="flex flex-1 flex-col min-w-0 overflow-hidden bg-muted">
          <div className="flex items-center gap-4 flex-shrink-0 px-10 py-4">
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 -ml-2 text-muted-foreground hover:text-foreground shrink-0"
              onClick={() => {
                clearForkRunTimer()
                setForkRunPhase("draft")
                setForkRunStartTime(null)
                setSelectedRunId(null)
                setSelectedGanttNode(null)
                setForkSourceRun(null)
                setForkDrawerOpen(false)
              }}
            >
              <ChevronLeft className="h-4 w-4" />
              Back to Analytics
            </Button>
          </div>
          <div
            className="flex-1 overflow-auto px-10 pb-6"
            onClick={(e) => {
              if ((e.target as HTMLElement).closest("[data-workflow-gantt]")) return
              setSelectedGanttNode(null)
            }}
            role="presentation"
          >
            <div className="flex items-center justify-between gap-4 mb-1">
              <h1 className="text-xl font-semibold tracking-tight">
                {isForkDraftView ? "Fork run" : "Run Details"}
              </h1>
              <div className="flex items-center gap-2 flex-wrap justify-end min-w-0">
                <TooltipProvider delayDuration={200}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        aria-label="More run actions"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <DropdownMenuItem className="gap-2" onSelect={() => setSaveToDatasetOpen(true)}>
                            <Database className="h-4 w-4" />
                            Save Run to dataset
                          </DropdownMenuItem>
                        </TooltipTrigger>
                        <TooltipContent side="left" className="max-w-xs text-balance">
                          Store this run’s inputs and outputs in a dataset for training, review, or audits later.
                        </TooltipContent>
                      </Tooltip>
                      {!isForkDraftView ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <DropdownMenuItem
                              className="gap-2"
                              onSelect={() => {
                                tabContext?.openExperimentVariantBuilderIntro?.()
                              }}
                            >
                              <GitFork className="h-4 w-4" />
                              Fork Run
                            </DropdownMenuItem>
                          </TooltipTrigger>
                          <TooltipContent side="left" className="max-w-xs text-balance">
                            Open the Experiment variant-builder flow (intro modal, then Workflow in variant mode, then
                            Create variant)—same as Add variant column on the Experiment tab.
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <DropdownMenuItem className="gap-2" onSelect={() => openForkSheetFresh()}>
                              <GitFork className="h-4 w-4" />
                              Fork settings
                            </DropdownMenuItem>
                          </TooltipTrigger>
                          <TooltipContent side="left" className="max-w-xs text-balance">
                            Open the fork sheet to edit which nodes differ from the source run before you execute the
                            fork.
                          </TooltipContent>
                        </Tooltip>
                      )}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <DropdownMenuItem
                            className={cn(
                              "gap-2",
                              (selectedRun.status === "running" || isForkDraftView) && "opacity-50",
                            )}
                            aria-disabled={selectedRun.status === "running" || isForkDraftView}
                            onSelect={(e) => {
                              e.preventDefault()
                              if (selectedRun.status === "running" || isForkDraftView || !selectedRunId) return
                              openEvaluateRunDialog(selectedRunId)
                            }}
                          >
                            <ListChecks className="h-4 w-4" />
                            Evaluate Run
                          </DropdownMenuItem>
                        </TooltipTrigger>
                        <TooltipContent side="left" className="max-w-xs text-balance">
                          {isForkDraftView
                            ? "Evaluate the source run from the main runs list, or finish the fork first."
                            : selectedRun.status === "running"
                              ? "Wait until this run finishes before queuing an evaluation."
                              : "Choose an evaluator and run it against this run; results appear in the sidebar."}
                        </TooltipContent>
                      </Tooltip>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TooltipProvider>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              {isForkDraftView
                ? forkRunPhase === "running"
                  ? "Fork is running — the timeline below updates as each step completes."
                  : forkRunPhase === "complete"
                    ? "Fork finished successfully. Click a node on the timeline to inspect inputs and outputs."
                    : "This fork has not been executed yet — the timeline stays empty until you run the fork. Use the sheet on the right to choose what changes from the original workflow."
                : "Inspect a single Run. Click on a node to see inputs and outputs."}
            </p>
            <div className="flex w-full flex-col gap-0">
              {isForkDraftView && forkRunPhase === "draft" ? (
                <div
                  className="flex min-h-[280px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/80 bg-muted/20 px-6 py-12 text-center"
                  data-workflow-gantt
                >
                  <GitFork className="h-10 w-10 text-muted-foreground/45" aria-hidden />
                  <p className="text-sm font-medium text-foreground">No steps yet</p>
                  <p className="max-w-md text-xs text-muted-foreground">
                    Configure the fork in the sheet, then use Run fork. Steps and timings will appear here after the replay.
                  </p>
                </div>
              ) : isForkDraftView && forkRunPhase === "running" && forkRunStartTime != null ? (
                <div className="min-h-[320px] min-w-0">
                  <WorkflowGantt
                    compact
                    isRunning
                    runStartTime={forkRunStartTime}
                    nodes={forkReplayGanttNodes}
                    selectedNodeId={selectedGanttNode?.id ?? null}
                    onNodeSelect={setSelectedGanttNode}
                    highlightNodeId={hoveredContextNodeId}
                    signalNodeId={null}
                    onCompareClick={handleCompareClick}
                  />
                </div>
              ) : (
                <WorkflowGantt
                  nodes={activeRunDetailGanttNodes}
                  selectedNodeId={selectedGanttNode?.id ?? null}
                  onNodeSelect={setSelectedGanttNode}
                  highlightNodeId={hoveredContextNodeId}
                  signalNodeId={ganttSignalNodeId}
                  rootCauseNodeId={ganttRootCauseNodeId}
                  onCompareClick={handleCompareClick}
                />
              )}
              <div className="flex shrink-0 justify-end gap-2 pt-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-muted-foreground hover:text-foreground"
                  disabled={
                    isForkDraftView ||
                    !selectedRun ||
                    runs.findIndex((r) => r.runId === selectedRunId) <= 0
                  }
                  onClick={() => {
                    const idx = runs.findIndex((r) => r.runId === selectedRunId)
                    if (idx > 0) {
                      setSelectedRunId(runs[idx - 1].runId)
                      setSelectedGanttNode(null)
                    }
                  }}
                  aria-label="Previous run"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous run
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-muted-foreground hover:text-foreground"
                  disabled={
                    isForkDraftView ||
                    !selectedRun ||
                    runs.findIndex((r) => r.runId === selectedRunId) >= runs.length - 1
                  }
                  onClick={() => {
                    const idx = runs.findIndex((r) => r.runId === selectedRunId)
                    if (idx >= 0 && idx < runs.length - 1) {
                      setSelectedRunId(runs[idx + 1].runId)
                      setSelectedGanttNode(null)
                    }
                  }}
                  aria-label="Next run"
                >
                  Next run
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Run sidebar - can be closed when on General */}
        {sidebarOpen && (
        <aside className="w-96 border-l border-border bg-card flex-shrink-0 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b border-border gap-2">
            <div className="flex items-center gap-1 min-w-0">
              {selectedGanttNode && !sidebarShowGeneral ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 -ml-1"
                  onClick={() => {
                    setSidebarShowGeneral(true)
                    setSelectedGanttNode(null)
                  }}
                  aria-label="Back to General"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              ) : null}
              <div className="flex items-center gap-2 min-w-0">
                {selectedGanttNode && !sidebarShowGeneral && (
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted/60 border border-border/50">
                    <GanttNodeIcon type={selectedGanttNode.icon} />
                  </span>
                )}
                <h2 className="text-base font-semibold truncate">
                  {!selectedGanttNode || sidebarShowGeneral
                    ? "General"
                    : selectedGanttNode.label === "AI Agent"
                      ? "AI Agent"
                      : selectedGanttNode.label}
                </h2>
                {selectedGanttNode && !sidebarShowGeneral && (
                  <>
                    <span
                      className={cn(
                        "flex h-3 w-3 shrink-0 items-center justify-center rounded-full",
                        selectedGanttNode.status === "error" ? "bg-red-500" : "bg-green-500"
                      )}
                      aria-label={selectedGanttNode.status === "error" ? "Failed" : "Success"}
                    >
                      {selectedGanttNode.status === "error" ? (
                        <X className="h-2 w-2 text-white stroke-[3]" />
                      ) : (
                        <Check className="h-2 w-2 text-white stroke-[3]" />
                      )}
                    </span>
                  </>
                )}
                {(!selectedGanttNode || sidebarShowGeneral) &&
                  selectedRun &&
                  selectedRun.status !== "running" && (
                  <span
                    className={cn(
                      "shrink-0 px-2.5 py-0.5 text-xs font-medium rounded-full",
                      selectedRun.status === "error" || activeRunDetailGanttNodes.some((n) => n.status === "error")
                        ? "bg-red-100 text-red-700"
                        : "bg-green-100 text-green-700"
                    )}
                  >
                    {selectedRun.status === "error" || activeRunDetailGanttNodes.some((n) => n.status === "error")
                      ? "Failure"
                      : "Success"}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              <TooltipProvider delayDuration={200}>
                {selectedGanttNode?.label === "AI Agent" && !sidebarShowGeneral && (
                  <Tooltip delayDuration={200}>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        aria-label="Compare"
                        onClick={() => handleCompareClick(selectedGanttNode)}
                      >
                        <GitCompare className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" sideOffset={4} className="text-xs bg-white dark:bg-card border border-border shadow-md" hideArrow>
                      Compare
                    </TooltipContent>
                  </Tooltip>
                )}
                {onSwitchToWorkflow && selectedGanttNode && !sidebarShowGeneral && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={onSwitchToWorkflow}
                    aria-label="Locate in workflow"
                    title="Locate in workflow"
                  >
                    <Locate className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => setSidebarOpen(false)}
                  aria-label="Close panel"
                >
                  <X className="h-4 w-4" />
                </Button>
              </TooltipProvider>
            </div>
          </div>
          {resolvedRunSignal &&
            selectedGanttNode?.id === resolvedRunSignal.nodeId &&
            !sidebarShowGeneral && (
              <SignalInsightCard signal={resolvedRunSignal} onFixWithAi={onFixWithAi} />
            )}
          {(() => {
            const isAiAgent = selectedGanttNode?.label === "AI Agent"
            const triggerClass = "rounded-md px-4 text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
            if (!selectedGanttNode || sidebarShowGeneral) {
              return (
                <div key="general-details" className="flex-1 flex flex-col min-h-0 px-4 pb-4 pt-0 overflow-auto">
                  {resolvedRunSignal ? (
                    <SignalInsightCard
                      signal={resolvedRunSignal}
                      onFixWithAi={onFixWithAi}
                      containerClassName="mb-4 mt-3 w-full"
                    />
                  ) : null}
                  {isForkDraftView && forkSourceRun ? (
                    <div className="mb-3 rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-xs">
                      <p className="font-medium text-foreground">Source run</p>
                      <p className="mt-1 font-mono text-[11px] text-muted-foreground break-all">{forkSourceRun.runId}</p>
                      <button
                        type="button"
                        className="mt-2 text-xs font-medium text-primary underline-offset-4 hover:underline"
                        onClick={() => openForkSheetFresh()}
                      >
                        Open fork sheet
                      </button>
                      <Button
                        type="button"
                        size="sm"
                        className="mt-2 h-8 w-full text-xs font-medium"
                        onClick={() => setApplyWorkflowDraftModalOpen(true)}
                      >
                        Apply changes to the draft
                      </Button>
                    </div>
                  ) : null}
                  {runEvaluation ? (
                    <div className="mt-4 mb-4 shrink-0 space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">Evaluation</p>
                      <RunDetailEvalGradingRow
                        evalLabel={runEvaluation.evaluatorName}
                        score={runEvaluation.score}
                        summary={runEvaluation.summary}
                      />
                    </div>
                  ) : null}
                  {(() => {
                    if (!SHOW_RUN_SIDEBAR_GUARDRAILS) return null
                    const guardrailEvents = selectedRunId ? RUN_GUARDRAIL_EVENTS[selectedRunId] : undefined
                    if (!guardrailEvents?.length) return null
                    return (
                      <div className="mb-4 shrink-0 space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">Guardrails</p>
                        <div className="rounded-lg border border-border/70 overflow-hidden">
                          {guardrailEvents.map((ev) => (
                            <div key={ev.id} className={cn(
                              "flex items-center gap-2 px-3 py-2 text-xs border-b border-border/50 last:border-b-0",
                              ev.result === "flag" && "bg-amber-50/50 dark:bg-amber-950/20",
                              ev.result === "block" && "bg-red-50/50 dark:bg-red-950/20",
                            )}>
                              <Shield className={cn(
                                "h-3 w-3 shrink-0",
                                ev.result === "block" ? "text-red-500" : ev.result === "flag" ? "text-amber-500" : "text-emerald-600"
                              )} aria-hidden />
                              <div className="flex-1 min-w-0">
                                <span className="block truncate font-medium text-foreground">{ev.label}</span>
                                <span className="text-muted-foreground/60 text-[11px]">{ev.node}</span>
                              </div>
                              <span className={cn(
                                "shrink-0 text-[9px] font-semibold uppercase tracking-wide rounded px-1.5 py-0.5",
                                ev.result === "pass" && "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
                                ev.result === "flag" && "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
                                ev.result === "block" && "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400",
                              )}>
                                {ev.result === "pass" ? "Passed" : ev.result === "flag" ? "Flagged" : "Blocked"}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })()}
                  {false /* hide per-node scores for now */ &&
                  selectedRun.nodeScores &&
                  selectedRun.nodeScores.length > 0 ? (
                    <div className="mb-4 shrink-0 space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">Per-node scores</p>
                      <div className="rounded-lg border border-border/70 overflow-hidden">
                        {selectedRun.nodeScores.map((ns, i) => {
                          const pass = ns.score >= 70
                          return (
                            <div
                              key={ns.nodeId}
                              className={cn(
                                "flex items-center gap-2 px-3 py-2 text-xs border-b border-border/50 last:border-b-0",
                                ns.rootCause && "bg-red-50/60 dark:bg-red-950/20"
                              )}
                            >
                              <span
                                className={cn(
                                  "shrink-0 w-8 text-center tabular-nums font-semibold rounded px-1 py-0.5",
                                  pass
                                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                                    : "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400"
                                )}
                              >
                                {(ns.score / 10).toFixed(1)}
                              </span>
                              <span className={cn("flex-1 min-w-0 truncate", ns.rootCause ? "text-red-700 dark:text-red-400 font-medium" : "text-foreground")}>
                                {ns.nodeLabel}
                              </span>
                              {ns.rootCause && (
                                <span className="shrink-0 text-[9px] font-semibold uppercase tracking-wide rounded px-1.5 py-0.5 bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400">
                                  Root cause
                                </span>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ) : null}
                  <div className="flex flex-col text-sm">
                    {[
                      { icon: Hash, label: "Run ID", value: selectedRun.runId },
                      { icon: MessageCircle, label: "Conversation ID", value: selectedRun.conversationId },
                      { icon: MapPin, label: "Where", value: selectedRun.origin },
                      { icon: CalendarIcon, label: "Date", value: selectedRun.created },
                      { icon: Clock, label: "Duration", value: selectedRun.latency },
                      { icon: Bot, label: "AI Model", value: "OpenAI" },
                      { icon: User, label: "User ID", value: selectedRun.user },
                      { icon: Link2, label: "Used Tokens", value: String(selectedRun.tokens) },
                      { icon: ArrowDownToLine, label: "Workflow input", value: selectedRun.input || "—" },
                      { icon: ArrowUpFromLine, label: "Workflow output", value: selectedRun.output || "—" },
                      { icon: AlertCircle, label: "Errors", value: selectedRun.status === "error" ? selectedRun.output || "Error" : "N/A" },
                    ].map(({ icon: Icon, label, value }) =>
                      label === "Workflow input" || label === "Workflow output" ? (
                        <div key={label} className="py-3 border-b border-border/60 last:border-b-0">
                          <div className="flex items-center gap-2.5 mb-2">
                            <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <span className="text-muted-foreground font-medium">{label}</span>
                          </div>
                          <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm text-foreground/90 whitespace-pre-wrap break-words min-h-[80px]">
                            {value}
                          </div>
                        </div>
                      ) : (
                        <div key={label} className="flex items-center justify-between gap-4 py-3 border-b border-border/60 last:border-b-0">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <span className="text-muted-foreground font-medium">{label}</span>
                          </div>
                          <span className={cn("text-right font-mono text-xs truncate max-w-[200px]", label === "Run ID" && "text-[11px]")} title={value}>
                            {value}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                  {selectedRun?.status === "error" && (
                    <Alert variant="destructive" className="mt-4 rounded-lg border-destructive/50 bg-destructive/5 [&>svg]:text-destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle className="font-semibold text-destructive">This run failed</AlertTitle>
                      <AlertDescription className="flex flex-col gap-3 text-destructive/90">
                        <p className="text-sm">
                          The workflow did not complete successfully. Check the output for details or get help resolving the issue.
                        </p>
                        {(selectedRun.output && selectedRun.output !== "—") && (
                          <p className="text-sm whitespace-pre-wrap break-words mt-1 pt-2 border-t border-destructive/20">
                            {selectedRun.output}
                          </p>
                        )}
                        <Button size="sm" variant="outline" className="w-fit gap-2 border-destructive/40 bg-destructive/5 text-destructive hover:bg-destructive/10 hover:border-destructive/60">
                          <Bot className="h-3.5 w-3.5" />
                          Ask AI
                        </Button>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )
            }
            if (isAiAgent) {
              return (
              <Tabs key="ai-agent" defaultValue="completion" className="flex-1 flex flex-col min-h-0 p-4 gap-2 overflow-auto">
                <TabsList className="w-fit rounded-lg bg-muted p-1 h-9">
                  <TabsTrigger value="input" className={triggerClass}>input</TabsTrigger>
                  <TabsTrigger value="tools" className={triggerClass}>Tools</TabsTrigger>
                  <TabsTrigger value="completion" className={triggerClass}>Completion</TabsTrigger>
                </TabsList>
                <Separator className="my-1 bg-border/60" />
                <TabsContent value="input" className="flex-1 mt-0 flex flex-col gap-4">
                  <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm overflow-auto shrink-0 min-h-[300px]">
                    <p className="text-foreground/90 whitespace-pre-wrap break-words">
                      {getAiAgentTabContent(selectedGanttNode?.id ?? "").input}
                    </p>
                  </div>
                  {(() => {
                    const { inputFrom } = getNodeContext(selectedGanttNode, activeRunDetailGanttNodes)
                    return (
                      <div className="flex flex-col gap-2 pr-1 shrink-0">
                        <div className="text-sm font-medium flex items-center gap-2 py-1 text-muted-foreground">
                          <ArrowLeft className="h-4 w-4" />
                          Nodes connected from.
                        </div>
                        {inputFrom.length === 0 ? (
                          <p className="text-xs text-muted-foreground py-1">No upstream node.</p>
                        ) : (
                          inputFrom.map((n) => (
                            <button
                              key={n.id}
                              type="button"
                              className="flex w-full items-center gap-2 rounded-md bg-muted/20 py-2 px-3 text-left hover:bg-muted/30 hover:border-border/50 border border-transparent cursor-pointer transition-colors"
                              onClick={() => setSelectedGanttNode(n)}
                              onMouseEnter={() => setHoveredContextNodeId(n.id)}
                              onMouseLeave={() => setHoveredContextNodeId(null)}
                            >
                              <GanttNodeIcon type={n.icon} />
                              <span className="text-sm font-medium truncate flex-1 min-w-0">{n.label}</span>
                            </button>
                          ))
                        )}
                      </div>
                    )
                  })()}
                </TabsContent>
                <TabsContent value="tools" className="flex-1 mt-0 overflow-auto min-h-0 flex flex-col gap-4">
                  <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm overflow-auto flex flex-col shrink-0 min-h-[300px]">
                    <BeautifiedJson text={getAiAgentTabContent(selectedGanttNode?.id ?? "").tools} className="text-foreground/90" />
                  </div>
                </TabsContent>
                <TabsContent value="completion" className="mt-0 flex flex-col gap-4">
                  <div className="flex flex-col gap-2 shrink-0">
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Tabs defaultValue="formatted" className="w-fit">
                        <TabsList className="rounded-lg bg-muted p-1 h-8">
                          <TabsTrigger value="text" className="rounded-md px-3 text-xs text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm h-7">Text</TabsTrigger>
                          <TabsTrigger value="formatted" className="rounded-md px-3 text-xs text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm h-7">Formatted</TabsTrigger>
                        </TabsList>
                      </Tabs>
                      <div className="ml-auto flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => navigator.clipboard.writeText(getAiAgentTabContent(selectedGanttNode?.id ?? "").completion)}
                          title="Copy"
                          aria-label="Copy"
                        >
                          <Copy className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            const text = getAiAgentTabContent(selectedGanttNode?.id ?? "").completion
                            const blob = new Blob([text], { type: "text/plain" })
                            const url = URL.createObjectURL(blob)
                            const a = document.createElement("a")
                            a.href = url
                            a.download = `completion-${selectedGanttNode?.id ?? "agent"}.txt`
                            a.click()
                            URL.revokeObjectURL(url)
                          }}
                          title="Download"
                          aria-label="Download"
                        >
                          <Download className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                    </div>
                    <div className="relative rounded-lg border border-border bg-muted/30 p-3 min-h-[300px] max-h-[300px] text-sm overflow-auto shrink-0">
                      <BeautifiedJson
                        text={getAiAgentTabContent(selectedGanttNode?.id ?? "").completion}
                        className="text-foreground/90 pr-8"
                      />
                      <button
                        type="button"
                        className="absolute top-2 right-2 p-1.5 rounded-md bg-background/80 hover:bg-background border border-border/50 hover:border-border shadow-sm transition-colors z-10"
                        onClick={(e) => {
                          e.stopPropagation()
                          setCompletionModalOpen(true)
                        }}
                        title="Expand in modal"
                        aria-label="Expand in modal"
                      >
                        <Maximize2 className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                    </div>
                  </div>
                  {(() => {
                    const { outputTo } = getNodeContext(selectedGanttNode, activeRunDetailGanttNodes)
                    return (
                      <div className="flex flex-col gap-2 shrink-0">
                        <div className="text-sm font-medium flex items-center gap-2 py-1 text-muted-foreground">
                          <ArrowRight className="h-4 w-4" />
                          Nodes that connects to
                        </div>
                        {outputTo.length === 0 ? (
                          <p className="text-xs text-muted-foreground py-1">No downstream node.</p>
                        ) : (
                          outputTo.map((n) => (
                            <button
                              key={n.id}
                              type="button"
                              className="flex w-full items-center gap-2 rounded-md bg-muted/20 py-2 px-3 text-left hover:bg-muted/30 hover:border-border/50 border border-transparent cursor-pointer transition-colors"
                              onClick={() => setSelectedGanttNode(n)}
                              onMouseEnter={() => setHoveredContextNodeId(n.id)}
                              onMouseLeave={() => setHoveredContextNodeId(null)}
                            >
                              <GanttNodeIcon type={n.icon} />
                              <span className="text-sm font-medium truncate flex-1 min-w-0">{n.label}</span>
                            </button>
                          ))
                        )}
                      </div>
                    )
                  })()}
                </TabsContent>
              </Tabs>
              )
            }
            return (
              <Tabs key={selectedGanttNode?.id ?? "general"} defaultValue="output" className="flex-1 flex flex-col min-h-0 p-4 gap-2">
                <TabsList className="w-fit rounded-lg bg-muted p-1 h-9 flex-shrink-0">
                  <TabsTrigger value="input" className="rounded-md px-4 text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                    Input
                  </TabsTrigger>
                  <TabsTrigger value="output" className="rounded-md px-4 text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                    Output
                  </TabsTrigger>
                </TabsList>
                <Separator className="my-1 bg-border/60" />
                {selectedGanttNode?.status === "error" && (
                  <Alert variant="destructive" className="rounded-lg border-destructive/50 bg-destructive/5 [&>svg]:text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle className="font-semibold text-destructive">This node failed</AlertTitle>
                    <AlertDescription className="flex flex-col gap-3 text-destructive/90">
                      <p className="text-sm">
                        {selectedGanttNode?.label} did not complete successfully. Check the output for details or get help resolving the issue.
                      </p>
                      <Button size="sm" variant="outline" className="w-fit gap-2 border-destructive/40 bg-destructive/5 text-destructive hover:bg-destructive/10 hover:border-destructive/60">
                        <Bot className="h-3.5 w-3.5" />
                        Ask AI
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}
                <TabsContent value="input" className="flex-1 mt-0 overflow-auto min-h-0 flex flex-col gap-4">
                  <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm overflow-auto flex flex-col shrink-0 min-h-[300px]">
                    <BeautifiedJson text={getNodeInputOutput(selectedGanttNode).input} className="text-foreground/90" />
                  </div>
                  {(() => {
                    const { inputFrom } = getNodeContext(selectedGanttNode, activeRunDetailGanttNodes)
                    return (
                      <div className="flex flex-col gap-2 pr-1 shrink-0">
                        <div className="text-sm font-medium flex items-center gap-2 py-1 text-muted-foreground">
                          <ArrowLeft className="h-4 w-4" />
                          Nodes connected from.
                        </div>
                        {inputFrom.length === 0 ? (
                          <p className="text-xs text-muted-foreground py-1">No upstream node (this node starts first or has no prior node).</p>
                        ) : (
                          inputFrom.map((n) => (
                            <button
                              key={n.id}
                              type="button"
                              className="flex w-full items-center gap-2 rounded-md bg-muted/20 py-2 px-3 text-left hover:bg-muted/30 hover:border-border/50 border border-transparent cursor-pointer transition-colors"
                              onClick={() => setSelectedGanttNode(n)}
                              onMouseEnter={() => setHoveredContextNodeId(n.id)}
                              onMouseLeave={() => setHoveredContextNodeId(null)}
                            >
                              <GanttNodeIcon type={n.icon} />
                              <span className="text-sm font-medium truncate flex-1 min-w-0">{n.label}</span>
                            </button>
                          ))
                        )}
                      </div>
                    )
                  })()}
                </TabsContent>
                <TabsContent value="output" className="flex-1 mt-0 overflow-auto min-h-0 flex flex-col gap-4">
                  {selectedGanttNode?.status !== "error" && (
                    <>
                      <div className="flex flex-col gap-2 shrink-0">
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Tabs value={outputViewMode} onValueChange={(v) => setOutputViewMode(v as "text" | "formatted")} className="w-fit">
                            <TabsList className="rounded-lg bg-muted p-1 h-8">
                              <TabsTrigger value="text" className="rounded-md px-3 text-xs text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm h-7">Text</TabsTrigger>
                              <TabsTrigger value="formatted" className="rounded-md px-3 text-xs text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm h-7">Formatted</TabsTrigger>
                            </TabsList>
                          </Tabs>
                          <div className="ml-auto flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => navigator.clipboard.writeText(getNodeInputOutput(selectedGanttNode).output)}
                              title="Copy"
                              aria-label="Copy"
                            >
                              <Copy className="h-4 w-4 text-muted-foreground" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => {
                                const text = getNodeInputOutput(selectedGanttNode).output
                                const blob = new Blob([text], { type: "text/plain" })
                                const url = URL.createObjectURL(blob)
                                const a = document.createElement("a")
                                a.href = url
                                a.download = `output-${selectedGanttNode?.id ?? "node"}.txt`
                                a.click()
                                URL.revokeObjectURL(url)
                              }}
                              title="Download"
                              aria-label="Download"
                            >
                              <Download className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </div>
                        </div>
                        <div className="relative rounded-lg border border-border bg-muted/30 p-3 text-sm overflow-auto flex flex-col shrink-0 min-h-[300px] max-h-[300px]">
                        {outputViewMode === "text" ? (
                          <p className="text-foreground/90 whitespace-pre-wrap break-words pr-8">{getNodeInputOutput(selectedGanttNode).output}</p>
                        ) : (
                          <BeautifiedJson text={getNodeInputOutput(selectedGanttNode).output} className="text-foreground/90 pr-8" />
                        )}
                        <button
                          type="button"
                          className="absolute top-2 right-2 p-1.5 rounded-md bg-background/80 hover:bg-background border border-border/50 hover:border-border shadow-sm transition-colors z-10"
                          onClick={(e) => {
                            e.stopPropagation()
                            setOutputModalOpen(true)
                          }}
                          title="Expand in modal"
                          aria-label="Expand in modal"
                        >
                          <Maximize2 className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                        </div>
                      </div>
                    </>
                  )}
                  {(() => {
                    const { outputTo } = getNodeContext(selectedGanttNode, activeRunDetailGanttNodes)
                    return (
                      <div className="flex flex-col gap-2 pr-1 shrink-0">
                        <div className="text-sm font-medium flex items-center gap-2 py-1 text-muted-foreground">
                          <ArrowRight className="h-4 w-4" />
                          Nodes that connects to
                        </div>
                        {outputTo.length === 0 ? (
                          <p className="text-xs text-muted-foreground py-1">No downstream node (this node is last or output is terminal).</p>
                        ) : (
                          outputTo.map((n) => (
                            <button
                              key={n.id}
                              type="button"
                              className="flex w-full items-center gap-2 rounded-md bg-muted/20 py-2 px-3 text-left hover:bg-muted/30 hover:border-border/50 border border-transparent cursor-pointer transition-colors"
                              onClick={() => setSelectedGanttNode(n)}
                              onMouseEnter={() => setHoveredContextNodeId(n.id)}
                              onMouseLeave={() => setHoveredContextNodeId(null)}
                            >
                              <GanttNodeIcon type={n.icon} />
                              <span className="text-sm font-medium truncate flex-1 min-w-0">{n.label}</span>
                            </button>
                          ))
                        )}
                      </div>
                    )
                  })()}
                </TabsContent>
              </Tabs>
            )
          })()}
        </aside>
        )}
        {/* Completion expand modal - slide-in from right like NodeDetailModal */}
        {completionModalOpen &&
          createPortal(
            <>
              <div
                data-completion-modal="backdrop"
                className="fixed inset-0 bg-black/20 z-[100]"
                onClick={() => setCompletionModalOpen(false)}
                aria-hidden
              />
              <div
                data-completion-modal="content"
                className="fixed right-0 top-0 bottom-0 z-[101] flex flex-col bg-card shadow-2xl rounded-l-lg overflow-hidden"
                style={{
                  marginTop: "24px",
                  marginBottom: "24px",
                  marginRight: "24px",
                  height: "calc(100vh - 48px)",
                  width: "60%",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex flex-1 flex-col overflow-hidden min-h-0">
                  <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
                    <h2 className="text-xl font-semibold">AI Agent – Completion</h2>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => setCompletionModalOpen(false)}
                      aria-label="Close"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex-1 flex flex-col min-h-0 p-6 overflow-hidden">
                    <div className="flex items-center gap-2 flex-shrink-0 mb-4">
                      <Tabs defaultValue="formatted" className="w-fit">
                        <TabsList className="rounded-lg bg-muted p-1 h-8">
                          <TabsTrigger value="text" className="rounded-md px-3 text-xs text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm h-7">Text</TabsTrigger>
                          <TabsTrigger value="formatted" className="rounded-md px-3 text-xs text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm h-7">Formatted</TabsTrigger>
                        </TabsList>
                      </Tabs>
                      <div className="ml-auto flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => navigator.clipboard.writeText(getAiAgentTabContent(selectedGanttNode?.id ?? "").completion)}
                          title="Copy"
                          aria-label="Copy"
                        >
                          <Copy className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            const text = getAiAgentTabContent(selectedGanttNode?.id ?? "").completion
                            const blob = new Blob([text], { type: "text/plain" })
                            const url = URL.createObjectURL(blob)
                            const a = document.createElement("a")
                            a.href = url
                            a.download = `completion-${selectedGanttNode?.id ?? "agent"}.txt`
                            a.click()
                            URL.revokeObjectURL(url)
                          }}
                          title="Download"
                          aria-label="Download"
                        >
                          <Download className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                    </div>
                    <div className="rounded-lg border border-border bg-muted/30 p-4 flex-1 min-h-0 text-sm overflow-auto">
                      <CollapsibleJsonView
                        text={getAiAgentTabContent(selectedGanttNode?.id ?? "").completion}
                        className="text-foreground/90"
                        defaultExpandedDepth={2}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </>,
            document.body
          )}
        {/* Output expand modal */}
        {outputModalOpen &&
          selectedGanttNode &&
          createPortal(
            <>
              <div
                data-output-modal="backdrop"
                className="fixed inset-0 bg-black/20 z-[100]"
                onClick={() => setOutputModalOpen(false)}
                aria-hidden
              />
              <div
                data-output-modal="content"
                className="fixed right-0 top-0 bottom-0 z-[101] flex flex-col bg-card shadow-2xl rounded-l-lg overflow-hidden"
                style={{
                  marginTop: "24px",
                  marginBottom: "24px",
                  marginRight: "24px",
                  height: "calc(100vh - 48px)",
                  width: "60%",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex flex-1 flex-col overflow-hidden min-h-0">
                  <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
                    <h2 className="text-xl font-semibold">Output – {selectedGanttNode.label}</h2>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => setOutputModalOpen(false)}
                      aria-label="Close"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex-1 flex flex-col min-h-0 p-6 overflow-hidden">
                    <div className="flex items-center gap-2 flex-shrink-0 mb-4">
                      <div className="ml-auto flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => navigator.clipboard.writeText(getNodeInputOutput(selectedGanttNode).output)}
                          title="Copy"
                          aria-label="Copy"
                        >
                          <Copy className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                    </div>
                    <div className="rounded-lg border border-border bg-muted/30 p-4 flex-1 min-h-0 text-sm overflow-auto">
                      <BeautifiedJson text={getNodeInputOutput(selectedGanttNode).output} className="text-foreground/90" />
                    </div>
                  </div>
                </div>
              </div>
            </>,
            document.body
          )}
        <Drawer
          open={forkDrawerOpen}
          onOpenChange={(open) => {
            setForkDrawerOpen(open)
            if (!open) setForkAddPopoverOpen(false)
          }}
          direction="right"
          shouldScaleBackground={false}
          modal={false}
        >
          <DrawerContent className="ml-auto flex h-full max-h-[100dvh] w-full max-w-[440px] flex-col gap-0 border-l p-0 data-[vaul-drawer-direction=right]:sm:max-w-[440px]">
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              <div className="flex flex-col gap-3 border-b border-border/60 pb-4 text-left">
                <DrawerTitle>Fork this run</DrawerTitle>
                <DrawerDescription className="text-left text-sm">
                  {forkSteps.length > 0 ? (
                    <>
                      Start a new run from the same workflow as your source run, with the changes you pick below. Nothing
                      executes until you run the fork — the run detail view stays empty on purpose so you can confirm inputs
                      first.
                    </>
                  ) : (
                    <>
                      Add one or more workflow steps: click the field or chevron to open the list, then pick a step (type
                      to filter). Nothing runs until you run the fork — the run detail view stays empty on purpose.
                    </>
                  )}
                </DrawerDescription>
              </div>
              {forkSourceRun ? (
                <div className="mt-6 flex flex-col gap-5">
                  <div className="rounded-lg border border-border/80 bg-muted/30 px-3 py-2.5 text-xs">
                    <p className="font-medium text-foreground">Source run</p>
                    <p className="mt-1 font-mono text-[11px] text-muted-foreground break-all">{forkSourceRun.runId}</p>
                  </div>

                  <Popover open={forkAddPopoverOpen} onOpenChange={setForkAddPopoverOpen}>
                    <PopoverAnchor asChild>
                      <div className="relative flex w-full min-w-0 items-stretch overflow-hidden rounded-md border border-input bg-background shadow-xs transition-[color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
                        <Input
                          id="fork-add-step-combobox"
                          className="peer h-9 flex-1 min-w-0 border-0 bg-transparent px-3 py-1 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 pr-2"
                          placeholder="Add a workflow step to change…"
                          value={forkAddQuery}
                          role="combobox"
                          aria-expanded={forkAddPopoverOpen}
                          aria-haspopup="listbox"
                          aria-controls="fork-add-step-listbox"
                          aria-autocomplete="list"
                          autoComplete="off"
                          onChange={(e) => {
                            setForkAddQuery(e.target.value)
                            setForkAddPopoverOpen(true)
                          }}
                          onClick={() => setForkAddPopoverOpen(true)}
                          onFocus={() => setForkAddPopoverOpen(true)}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 shrink-0 rounded-none rounded-r-md border-l border-input text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                          aria-label={forkAddPopoverOpen ? "Close step list" : "Open step list"}
                          aria-expanded={forkAddPopoverOpen}
                          aria-controls="fork-add-step-listbox"
                          onMouseDown={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                          }}
                          onClick={() => setForkAddPopoverOpen((open) => !open)}
                        >
                          <ChevronDown
                            className={cn("size-4 transition-transform duration-200", forkAddPopoverOpen && "rotate-180")}
                            aria-hidden
                          />
                        </Button>
                      </div>
                    </PopoverAnchor>
                    <PopoverContent
                      className="z-[100] w-[var(--radix-popover-anchor-width)] min-w-[280px] p-0"
                      align="start"
                      sideOffset={6}
                      onOpenAutoFocus={(e) => e.preventDefault()}
                    >
                      <Command shouldFilter={false}>
                        <CommandList id="fork-add-step-listbox">
                          {forkAddCandidates.length === 0 ? (
                            <CommandEmpty className="py-6 text-xs text-muted-foreground">
                              {forkSteps.length >= WORKFLOW_NODES.length
                                ? "Every step is already in this fork."
                                : "No matching steps."}
                            </CommandEmpty>
                          ) : (
                            forkAddCandidates.map((node) => (
                              <CommandItem
                                key={node.id}
                                value={node.id}
                                keywords={[node.label, node.id]}
                                onSelect={() => addForkStep(node.id)}
                                className="gap-2"
                              >
                                <WorkflowNodeLucideIcon kind={node.iconKind} />
                                <span>{node.label}</span>
                              </CommandItem>
                            ))
                          )}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>

                  {forkSteps.map((step) => {
                    const nodeDef = WORKFLOW_NODES.find((n) => n.id === step.nodeId) ?? null
                    return (
                      <div
                        key={step.key}
                        className="flex flex-col gap-3 rounded-xl border border-border/80 bg-card/40 px-4 py-4"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-2">
                            {nodeDef ? <WorkflowNodeLucideIcon kind={nodeDef.iconKind} /> : null}
                            <span className="truncate text-sm font-medium text-foreground">
                              {nodeDef?.label ?? step.nodeId}
                            </span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                            aria-label="Remove this step"
                            onClick={() => removeForkStep(step.key)}
                          >
                            <X className="size-4" />
                          </Button>
                        </div>
                        <VariantNodeConfigFields
                          selectedNode={nodeDef}
                          values={step.values}
                          onFieldChange={(fieldKey, value) => updateForkStepValue(step.key, fieldKey, value)}
                          showSectionHeader={false}
                        />
                      </div>
                    )
                  })}

                  {forkSteps.length > 0 ? (
                    <Alert className="border-border/80 bg-muted/40 py-3 text-foreground [&>svg]:text-muted-foreground">
                      <Info className="size-4 shrink-0" aria-hidden />
                      <AlertTitle className="text-xs font-medium">Pinned nodes</AlertTitle>
                      <AlertDescription className="text-[11px] leading-snug text-muted-foreground">
                        All workflow nodes except the ones you configure here stay pinned to the baseline and do not change
                        between runs.
                      </AlertDescription>
                    </Alert>
                  ) : null}
                </div>
              ) : null}
            </div>
            <DrawerFooter className="mt-auto flex flex-row flex-wrap justify-end gap-2 border-t border-border/60 p-4 sm:justify-end">
              <DrawerClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DrawerClose>
              <Button
                type="button"
                disabled={forkSteps.length === 0}
                className="bg-foreground text-background hover:bg-foreground/90"
                onClick={() => {
                  const stepLabels = forkSteps.map(
                    (s) => WORKFLOW_NODES.find((n) => n.id === s.nodeId)?.label ?? s.nodeId,
                  )
                  const nodeLabel =
                    stepLabels.length === 1
                      ? stepLabels[0]
                      : stepLabels.length === 2
                        ? `${stepLabels[0]} and ${stepLabels[1]}`
                        : stepLabels.length > 2
                          ? `${stepLabels.slice(0, -1).join(", ")}, and ${stepLabels[stepLabels.length - 1]}`
                          : ""
                  clearForkRunTimer()
                  setForkDrawerOpen(false)
                  setForkAddPopoverOpen(false)
                  setForkRunPhase("running")
                  setForkRunStartTime(Date.now())
                  toast.success("Fork started", {
                    description: forkSourceRun
                      ? `Replaying from ${forkSourceRun.runId.slice(0, 8)}… with overrides for ${nodeLabel}.`
                      : "Replay started (prototype).",
                  })
                  const sourceSnapshot = forkSourceRun
                  const stepNodeIdsSnapshot = forkSteps.map((s) => s.nodeId)
                  forkRunCompleteTimerRef.current = setTimeout(() => {
                    setForkRunPhase("complete")
                    setForkRunStartTime(null)
                    forkRunCompleteTimerRef.current = null
                    if (sourceSnapshot) {
                      const out =
                        sourceSnapshot.output.trim() !== ""
                          ? sourceSnapshot.output
                          : JSON.stringify({
                              fork: true,
                              replay: "completed",
                              overrides: stepNodeIdsSnapshot,
                            })
                      onAppendRunRef.current({
                        runId: crypto.randomUUID(),
                        conversationId: sourceSnapshot.conversationId,
                        created: formatAnalyticsRunTimestamp(),
                        origin: "Fork",
                        version: sourceSnapshot.version,
                        status: "success",
                        input: sourceSnapshot.input,
                        output: out,
                        latency: "2.04s",
                        tokens: Math.max(8, sourceSnapshot.tokens - 7),
                        user: sourceSnapshot.user,
                      })
                    }
                  }, 5200)
                }}
              >
                Run fork
              </Button>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
        <Dialog
          open={applyWorkflowDraftModalOpen}
          onOpenChange={(open) => {
            if (!open) setApplyWorkflowDraftModalOpen(false)
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Apply changes to workflow draft</DialogTitle>
              <DialogDescription asChild>
                <div className="space-y-3 pt-1 text-left text-sm font-normal leading-relaxed text-muted-foreground">
                  <p>
                    This copies the selected step settings and workflow snapshot from{" "}
                    <span className="font-medium text-foreground">
                      {forkSteps.length > 0
                        ? forkSteps
                            .map((s) => WORKFLOW_NODES.find((n) => n.id === s.nodeId)?.label ?? s.nodeId)
                            .join(", ")
                        : "Variant Output"}
                    </span>{" "}
                    into your unpublished workflow draft. Matching nodes in the draft are replaced; other steps stay as
                    they are in the draft until you edit them there.
                  </p>
                  <p className="text-xs text-muted-foreground/90">
                    Nothing executes automatically. You can keep changing variants and re-running evaluators in this table
                    after you apply.
                  </p>
                </div>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-2">
              <Button type="button" variant="outline" onClick={() => setApplyWorkflowDraftModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                className="bg-foreground text-background hover:bg-foreground/90"
                onClick={() => {
                  setApplyWorkflowDraftModalOpen(false)
                  setForkDrawerOpen(false)
                  toast.success("Changes applied to the draft", {
                    description:
                      "Fork overrides are saved on this draft. Run fork when you are ready to replay the workflow.",
                  })
                  tabContext?.setActiveTab("Workflow")
                }}
              >
                Accept
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <SaveToDatasetModal
          open={saveToDatasetOpen}
          onOpenChange={setSaveToDatasetOpen}
          datasets={saveDatasets}
          setDatasets={setSaveDatasets}
        />
      </div>
      {evaluateRunDialog}
      </>
    )
  }

  return (
    <>
    <div className="flex flex-col h-full bg-background overflow-hidden">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {/* Single scroll region: sticky frosted toolbar so content slides underneath */}
        <div className="min-h-0 flex-1 overflow-auto bg-muted">
          <div className="sticky top-0 z-20 flex items-center justify-between bg-muted/55 px-6 py-4 backdrop-blur-md backdrop-saturate-150">
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" className="gap-2 bg-background/40">
                <RefreshCw className="h-4 w-4" />
                Last 7 days
              </Button>
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 bg-background/40">
                    <CalendarIcon className="h-4 w-4" />
                    {format(dateRange.from, "MMM dd, yyyy")} - {format(dateRange.to, "MMM dd, yyyy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    selected={dateRange}
                    onSelect={(range: { from?: Date; to?: Date } | undefined) => {
                      if (range?.from && range?.to) {
                        setDateRange({ from: range.from, to: range.to })
                        setIsCalendarOpen(false)
                      } else if (range?.from) {
                        setDateRange({ from: range.from, to: range.from })
                      }
                    }}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-2 bg-background/40">
                <Workflow className="h-4 w-4" />
                Flow Report
              </Button>
              <Button variant="outline" size="sm" className="gap-2 bg-background/40">
                <Download className="h-4 w-4" />
                Download Logs
              </Button>
            </div>
          </div>

          <div className="px-6 py-4">
        <Tabs value={analyticsTab} onValueChange={setAnalyticsTab} className="gap-0">
          <TabsList className="mb-6 h-auto min-h-9 w-full flex-wrap justify-start gap-1 rounded-lg bg-muted p-1 sm:w-fit sm:flex-nowrap">
            <TabsTrigger value="overview" className="px-3">
              Overview
            </TabsTrigger>
            <TabsTrigger value="conversations" className="px-3">
              Conversations
            </TabsTrigger>
            <TabsTrigger value="clusters" className="px-3">
              Clusters
            </TabsTrigger>
            <TabsTrigger value="guardrails" className="px-3">
              Guardrails
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-0 space-y-0">
        {/* Metrics stat bar + shared chart */}
        <Card className="mb-6 overflow-hidden py-0 gap-0">
          {/* Stat tabs row */}
          <div className="flex border-b border-border">
            {metrics.map((metric) => {
              const isTokens = metric.title === "Tokens"
              const tokenBreakdown = isTokens && "tokenBreakdown" in metric ? metric.tokenBreakdown : undefined
              const statValue =
                tokenBreakdown ? tokenBreakdown[tokenView].value : metric.value
              const tabClass = cn(
                "flex-1 flex flex-col gap-0.5 px-5 py-4 text-left transition-colors border-b-2 -mb-px",
                activeMetric === metric.title
                  ? "border-black bg-muted/50 text-foreground"
                  : "border-border/50 bg-background hover:bg-muted/40 text-muted-foreground"
              )
              if (isTokens) {
                return (
                  <div
                    key={metric.title}
                    role="button"
                    tabIndex={0}
                    onClick={() => setActiveMetric("Tokens")}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        setActiveMetric("Tokens")
                      }
                    }}
                    className={cn(tabClass, "cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2")}
                  >
                    <div className="flex min-w-0 items-center gap-1.5">
                      <span className={cn("text-xs font-medium leading-none shrink-0", activeMetric === "Tokens" ? "text-muted-foreground" : "text-muted-foreground/60")}>
                        {metric.title}
                      </span>
                      {tokenBreakdown && (
                        <div
                          className="flex shrink-0 items-center"
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                        >
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className={cn(
                                  "inline-flex h-5 items-center gap-0.5 rounded-sm px-0.5 text-[11px] font-normal leading-none transition-colors cursor-pointer select-none",
                                  activeMetric === "Tokens"
                                    ? "text-muted-foreground/45 hover:text-muted-foreground/65"
                                    : "text-muted-foreground/35 hover:text-muted-foreground/50"
                                )}
                                aria-label="Token breakdown"
                              >
                                {tokenView === "total" ? "total" : tokenView === "input" ? "input" : "output"}
                                <ChevronDown
                                  className={cn(
                                    "h-2.5 w-2.5 shrink-0 transition-opacity",
                                    activeMetric === "Tokens" ? "opacity-30" : "opacity-20"
                                  )}
                                  aria-hidden
                                />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="min-w-[7.5rem]">
                              <DropdownMenuRadioGroup
                                value={tokenView}
                                onValueChange={(v) => {
                                  if (v === "total" || v === "input" || v === "output") setTokenView(v)
                                }}
                              >
                                <DropdownMenuRadioItem value="total">Total</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="input">Input</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="output">Output</DropdownMenuRadioItem>
                              </DropdownMenuRadioGroup>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      )}
                    </div>
                    <span className={cn("text-xl font-semibold tabular-nums", activeMetric === "Tokens" ? "text-foreground" : "text-muted-foreground")}>
                      {statValue}
                    </span>
                  </div>
                )
              }
              return (
                <button
                  key={metric.title}
                  type="button"
                  onClick={() => setActiveMetric(metric.title)}
                  className={tabClass}
                >
                  <span className={cn("text-xs font-medium", activeMetric === metric.title ? "text-muted-foreground" : "text-muted-foreground/60")}>
                    {metric.title}
                  </span>
                  <span className={cn("text-xl font-semibold tabular-nums", activeMetric === metric.title ? "text-foreground" : "text-muted-foreground")}>
                    {statValue}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Single shared chart */}
          <div className="px-6 pt-6 pb-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activeMetricData.data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="metricGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#111" stopOpacity={0.12} />
                    <stop offset="95%" stopColor="#111" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#e5e7eb" strokeDasharray="0" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis hide />
                <RechartsTooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff" }}
                  labelStyle={{ fontWeight: 600 }}
                  itemStyle={{ color: "#111" }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#111"
                  strokeWidth={1.5}
                  fill="url(#metricGradient)"
                  dot={false}
                  activeDot={{ r: 4, fill: "#111" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Unified recommendations + signals + clusters panel */}
        <div className="mb-4">
          <UnifiedAlertsPanel
            signals={overviewSignalRows}
            clusters={overviewClusterRows}
            signalsHighCount={overviewSignalsHighCount}
            clustersHighCount={overviewClustersHighCount}
            onReviewRun={(item) => {
              if (!item.runId) return
              setSelectedRunId(item.runId)
            }}
            onSignalAction={(item, action) => {
              if (action.kind === "evaluator") {
                tabContext?.openExperimentWithRun({ runId: item.runId, caseInput: runs.find(r => r.runId === item.runId)?.input })
              } else if (action.kind === "workflow") {
                tabContext?.setActiveTab("Workflow")
              } else if (action.kind === "guardrail") {
                setAnalyticsTab("guardrails")
              }
            }}
            onOpenCluster={(clusterId) => {
              setSelectedClusterId(clusterId)
              setAnalyticsTab("clusters")
            }}
          />
        </div>

        {/* Filters - outside card */}
        <div className="mb-4 flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                Columns
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuCheckboxItem
                checked={overviewShowEvaluatorColumn}
                onCheckedChange={setOverviewShowEvaluatorColumn}
              >
                Evaluator
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Data Table */}
        <Card className="gap-0 py-0">
          <CardContent className="p-0">
            <TooltipProvider delayDuration={200}>
              <Table>
                <TableHeader className="bg-muted/60">
                  <TableRow className="border-b border-border hover:bg-transparent">
                    <TableHead className="w-8 max-w-[2.25rem] p-2 pl-3 text-xs font-medium text-muted-foreground">
                      <span className="sr-only">Alerts</span>
                    </TableHead>
                    <TableHead className="w-[9rem] max-w-[9rem] text-xs font-medium text-muted-foreground">Run ID</TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground">Conversation ID</TableHead>
                    <TableHead className="w-[7.5rem] min-w-[7.5rem] text-xs font-medium text-muted-foreground">Where</TableHead>
                    <TableHead className="w-[3.25rem] min-w-[3.25rem] text-xs font-medium text-muted-foreground">Version</TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground">
                      <div className="flex items-center gap-1">
                        Status
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground">
                      <div className="flex items-center gap-1">
                        Created
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    {overviewShowEvaluatorColumn && (
                      <TableHead className="text-xs font-medium text-muted-foreground min-w-[11rem]">Evaluator</TableHead>
                    )}
                    <TableHead className="text-xs font-medium text-muted-foreground max-w-[18rem]">
                      <div className="flex items-center gap-1">
                        Input(s)
                        <Search className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground max-w-[18rem]">
                      <div className="flex items-center gap-1">
                        Output(s)
                        <Search className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground">
                      <div className="flex items-center gap-1">
                        Latency
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground">Tokens</TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground">
                      <div className="flex items-center gap-1">
                        User
                        <Search className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead className="sticky right-0 z-20 w-12 min-w-12 border-l border-border/80 bg-white p-2 pr-3 text-right align-middle shadow-[-8px_0_16px_-8px_rgba(0,0,0,0.12)] dark:bg-card dark:shadow-[-8px_0_16px_-8px_rgba(0,0,0,0.35)]">
                      <span className="sr-only">Row actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {runsForOverviewTable.map((run) => {
                    const sig = getOverviewSignalForRun(run.runId)
                    const isError = run.status === "error"
                    return (
                    <TableRow
                      key={run.runId}
                      className={cn(
                        "group cursor-pointer hover:bg-muted/50",
                        isError && "bg-red-50/60 hover:bg-red-50/80 dark:bg-red-950/20 dark:hover:bg-red-950/30",
                        !isError && sig && "bg-yellow-50/60 hover:bg-yellow-50/80 dark:bg-yellow-950/20 dark:hover:bg-yellow-950/30"
                      )}
                      onClick={() => setSelectedRunId(run.runId)}
                    >
                      <TableCell className="w-8 max-w-[2.25rem] p-2 pl-3 align-middle">
                        {(sig || isError) && (
                          <Tooltip delayDuration={200}>
                            <TooltipTrigger asChild>
                              <span
                                className={cn("inline-flex cursor-help", isError ? "text-red-500" : "text-yellow-500")}
                                aria-label={isError ? "Error" : `Signal: ${sig!.type}`}
                                onClick={(e) => e.stopPropagation()}
                              >
                                {isError
                                  ? <CircleAlert className="h-3.5 w-3.5 shrink-0" aria-hidden />
                                  : <TriangleAlert className="h-3.5 w-3.5 shrink-0" aria-hidden />
                                }
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-sm text-left text-xs" hideArrow>
                              {sig ? (
                                <>
                                  <p className="font-medium text-foreground">{sig.type}</p>
                                  <p className="mt-1 text-muted-foreground">{sig.reason}</p>
                                </>
                              ) : (
                                <p className="font-medium text-foreground">Run failed with an error</p>
                              )}
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </TableCell>
                      <TableCell className="w-[9rem] max-w-[9rem] font-mono text-xs text-muted-foreground">
                        <span className="block truncate" title={run.runId}>{run.runId}</span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{run.conversationId}</TableCell>
                      <TableCell>
                        <span className="inline-flex rounded-md border border-border/80 bg-muted/40 px-2 py-0.5 text-xs font-medium text-foreground/90">
                          {run.origin}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground tabular-nums">
                        {run.version}
                      </TableCell>
                      <TableCell>
                        <span className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium",
                          run.status === "success"
                            ? "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950/40 dark:text-green-400"
                            : run.status === "error"
                            ? "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400"
                            : "border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-400"
                        )}>
                          <span className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            run.status === "success" ? "bg-green-500" :
                            run.status === "error" ? "bg-red-500" :
                            "bg-yellow-500"
                          )} />
                          <span className="capitalize">{run.status}</span>
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{run.created}</TableCell>
                      {overviewShowEvaluatorColumn && (
                        <TableCell className="align-middle">
                          {(() => {
                            const ev = evalOverridesByRunId[run.runId] ?? RUN_EVALUATION_BY_ID[run.runId]
                            if (!ev) {
                              return <span className="text-sm text-muted-foreground/60">—</span>
                            }
                            return (
                              <Tooltip delayDuration={200}>
                                <TooltipTrigger asChild>
                                  {(() => {
                                    const threshold = EVALUATOR_PASS_THRESHOLDS[ev.evaluatorName]
                                    const pass = threshold == null || ev.score >= threshold
                                    return (
                                      <div className="inline-flex max-w-[14rem] cursor-default items-center gap-2 text-left">
                                        <span className="truncate text-xs font-medium text-foreground">{ev.evaluatorName}</span>
                                        <span className={cn(
                                          "shrink-0 rounded px-1.5 py-0.5 text-[11px] tabular-nums font-semibold",
                                          pass
                                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                                            : "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400",
                                        )}>
                                          {(ev.score / 10).toFixed(1)}
                                        </span>
                                      </div>
                                    )
                                  })()}
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-xs text-xs" hideArrow>
                                  {ev.summary}
                                </TooltipContent>
                              </Tooltip>
                            )
                          })()}
                        </TableCell>
                      )}
                      <TableCell className="min-w-0 max-w-[18rem]">
                        <Tooltip delayDuration={200}>
                          <TooltipTrigger asChild>
                            <span className="block w-full cursor-default truncate text-left">
                              {run.input}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-md text-xs" hideArrow>
                            {run.input}
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell className="min-w-0 max-w-[18rem]">
                        <Tooltip delayDuration={200}>
                          <TooltipTrigger asChild>
                            <span className="block w-full cursor-default truncate text-left">
                              {run.output}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-md text-xs" hideArrow>
                            {run.output}
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell>{run.latency}</TableCell>
                      <TableCell>{run.tokens}</TableCell>
                      <TableCell>{run.user}</TableCell>
                      <TableCell
                        className={cn(
                          "sticky right-0 z-10 w-12 min-w-12 border-l border-border/80 p-1 pr-2 text-right align-middle shadow-[-8px_0_16px_-8px_rgba(0,0,0,0.12)] dark:shadow-[-8px_0_16px_-8px_rgba(0,0,0,0.35)]",
                          "bg-white group-hover:bg-neutral-50 dark:bg-card dark:group-hover:bg-muted"
                        )}
                        onClick={(e) => e.stopPropagation()}
                        onPointerDown={(e) => e.stopPropagation()}
                      >
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              aria-label={`Actions for run ${run.runId}`}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <DropdownMenuItem
                                  className="gap-2"
                                  onSelect={() => {
                                    setSaveToDatasetOpen(true)
                                  }}
                                >
                                  <Database className="h-4 w-4" />
                                  Save Run to dataset
                                </DropdownMenuItem>
                              </TooltipTrigger>
                              <TooltipContent side="left" className="max-w-xs text-balance">
                                Store this run’s inputs and outputs in a dataset for training, review, or audits later.
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <DropdownMenuItem
                                  className="gap-2"
                                  onSelect={() => {
                                    tabContext?.openExperimentVariantBuilderIntro?.()
                                  }}
                                >
                                  <GitFork className="h-4 w-4" />
                                  Fork Run
                                </DropdownMenuItem>
                              </TooltipTrigger>
                              <TooltipContent side="left" className="max-w-xs text-balance">
                                Open the Experiment variant-builder flow (intro modal, then Workflow in variant mode,
                                then Create variant)—same as Add variant column on the Experiment tab.
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <DropdownMenuItem
                                  className={cn("gap-2", run.status === "running" && "opacity-50")}
                                  aria-disabled={run.status === "running"}
                                  onSelect={(e) => {
                                    e.preventDefault()
                                    if (run.status === "running") return
                                    openEvaluateRunDialog(run.runId)
                                  }}
                                >
                                  <ListChecks className="h-4 w-4" />
                                  Evaluate Run
                                </DropdownMenuItem>
                              </TooltipTrigger>
                              <TooltipContent side="left" className="max-w-xs text-balance">
                                {run.status === "running"
                                  ? "Wait until this run finishes before queuing an evaluation."
                                  : "Choose an evaluator and run it; results appear on Run Details and in the sidebar."}
                              </TooltipContent>
                            </Tooltip>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </TooltipProvider>
            {/* Pagination — bar height + tint aligned with table header */}
            <div className="flex items-center justify-end gap-1.5 border-t border-border bg-muted/60 px-4 py-1.5">
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs font-normal" disabled>
                &lt; Previous
              </Button>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs font-normal">
                Next &gt;
              </Button>
            </div>
          </CardContent>
        </Card>
          </TabsContent>

          <TabsContent value="conversations" className="mt-0">
            <Card className="overflow-hidden py-0 gap-0 border-border bg-background shadow-sm">
              <div className="flex min-h-[min(70vh,560px)] max-h-[min(85vh,720px)]">
                {/* Conversation list */}
                <aside className="flex w-[min(100%,280px)] shrink-0 flex-col border-r border-border bg-muted/50">
                  <div className="flex items-center justify-between gap-2 px-4 py-3.5">
                    <span className="text-sm font-medium text-foreground">Conversations</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                      aria-label="Search conversations"
                    >
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 pb-3">
                    {mockConversations.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSelectedConversationId(c.id)}
                        className={cn(
                          "w-full rounded-md px-3 py-2.5 text-left text-sm transition-colors",
                          selectedConversation?.id === c.id
                            ? "bg-muted text-foreground"
                            : "text-foreground/90 hover:bg-muted/70"
                        )}
                      >
                        {c.listLabel}
                      </button>
                    ))}
                  </div>
                </aside>

                {/* Thread */}
                <div className="flex min-w-0 flex-1 flex-col bg-background">
                  {selectedConversation ? (
                    <>
                      <div className="flex shrink-0 items-start justify-between gap-4 px-8 pb-6 pt-8">
                        <div className="min-w-0">
                          <h2 className="text-xl font-bold tracking-tight text-foreground">{selectedConversation.title}</h2>
                          <p className="mt-1 text-sm text-muted-foreground">
                            User: {selectedConversation.userLabel} <span className="text-muted-foreground/80">•</span>{" "}
                            {selectedConversation.dateLabel}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="shrink-0 gap-1.5"
                          onClick={() => setSelectedRunId(selectedConversation.runId)}
                        >
                          <Workflow className="h-4 w-4" />
                          See run
                        </Button>
                      </div>
                      <div className="flex flex-1 flex-col justify-center gap-6 overflow-y-auto px-8 pb-12 pt-2">
                        {selectedConversation.messages.map((m, i) =>
                          m.role === "user" ? (
                            <div key={`${i}-user`} className="flex justify-end">
                              <div className="max-w-[85%] rounded-2xl bg-muted px-4 py-2.5 text-sm text-foreground">
                                {m.text}
                              </div>
                            </div>
                          ) : (
                            <div key={`${i}-asst`} className="flex justify-start">
                              <p className="max-w-[85%] text-sm leading-relaxed text-foreground">{m.text}</p>
                            </div>
                          )
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted-foreground">
                      Select a conversation
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="clusters" className="mt-0">
            {selectedClusterId == null ? (
              <>
                <ManusTipBanner className="mb-3">
                  <p className="text-muted-foreground">
                    <span className="font-semibold text-foreground">Clusters</span>{" "}
                    are groups of runs that failed in the same way — automatically detected by comparing outputs semantically, so you can spot recurring problems without reviewing every run individually.
                  </p>
                </ManusTipBanner>
                {/* ── Cluster list ── */}
                <Card className="gap-0 py-0">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-muted/60">
                      <TableRow className="border-b border-border hover:bg-transparent">
                        <TableHead className="w-8 p-2 pl-3"><span className="sr-only">Severity</span></TableHead>
                        <TableHead className="text-xs font-medium text-muted-foreground">Issue</TableHead>
                        <TableHead className="text-xs font-medium text-muted-foreground">Workflow</TableHead>
                        <TableHead className="w-20 text-xs font-medium text-muted-foreground text-right">Events</TableHead>
                        <TableHead className="w-32 text-xs font-medium text-muted-foreground">First seen</TableHead>
                        <TableHead className="w-28 text-xs font-medium text-muted-foreground">Last seen</TableHead>
                        <TableHead className="w-8 p-2 pr-3"><span className="sr-only">Open</span></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {OVERVIEW_CLUSTERS.map((c) => {
                        const isHigh = c.severity === "high"
                        return (
                          <TableRow
                            key={c.id}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => setSelectedClusterId(c.id)}
                          >
                            <TableCell className="w-8 p-2 pl-3">
                              <span
                                className={cn("block h-2 w-2 rounded-full", isHigh ? "bg-red-500" : "bg-amber-400")}
                                aria-label={isHigh ? "High" : "Medium"}
                              />
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-0.5">
                                <span className="text-[13px] font-medium text-foreground">{c.label}</span>
                                <span className="line-clamp-1 text-xs text-muted-foreground">{c.failureMode}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">{c.workflow}</TableCell>
                            <TableCell className="text-right tabular-nums text-sm font-medium">{c.affectedRuns}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{c.firstSeen}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{c.lastSeen}</TableCell>
                            <TableCell className="p-2 pr-3 text-right">
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
              </>
            ) : (() => {
              /* ── Cluster detail ── */
              const c = OVERVIEW_CLUSTERS.find((x) => x.id === selectedClusterId)!
              const isHigh = c.severity === "high"
              return (
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex flex-col gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedClusterId(null)}
                      className="flex w-fit items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ChevronRight className="h-3.5 w-3.5 rotate-180" />
                      Clusters
                    </button>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className={cn("h-2 w-2 shrink-0 rounded-full", isHigh ? "bg-red-500" : "bg-amber-400")} />
                          <span className="text-base font-semibold text-foreground">{c.label}</span>
                          <span
                            className={cn(
                              "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                              isHigh
                                ? "bg-red-50 text-red-600 ring-1 ring-inset ring-red-200"
                                : "bg-amber-50 text-amber-600 ring-1 ring-inset ring-amber-200"
                            )}
                          >
                            {isHigh ? "High" : "Medium"}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">{c.workflow} · {c.affectedRuns} events</span>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <Button size="sm" variant="outline" className="h-7 px-2.5 text-xs bg-background">
                          Promote to eval
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-7 w-7 shrink-0 bg-background"
                              aria-label="More cluster actions"
                            >
                              <MoreVertical className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52">
                            <DropdownMenuItem
                              className="gap-2 text-xs"
                              onSelect={() => setSelectedRunId(c.anchorRunId)}
                            >
                              <ArrowRight className="h-3 w-3" />
                              View anchor run
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="gap-2 text-xs"
                              onSelect={() => setSaveToDatasetOpen(true)}
                            >
                              <Database className="h-3 w-3" />
                              Save to dataset
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>

                  {/* Cause + Fix */}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border border-border bg-white p-3 dark:bg-card">
                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Suspected cause</p>
                      <p className="text-xs leading-relaxed text-foreground/85">{c.suspectedCause}</p>
                    </div>
                    <div className="flex flex-col gap-3 rounded-lg border border-border bg-white p-3 dark:bg-card">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                          Suggested fix
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 shrink-0 border-border bg-white px-3 text-xs shadow-none hover:bg-muted/40 dark:bg-card dark:hover:bg-muted/30"
                          onClick={() =>
                            toast.success("Fix started", {
                              description: "We’ll apply this suggestion as a draft workflow change you can review.",
                            })
                          }
                        >
                          Fix
                        </Button>
                      </div>
                      <p className="text-xs leading-relaxed text-foreground/85">{c.suggestion}</p>
                    </div>
                  </div>

                  {/* Runs table */}
                  <Card className="gap-0 py-0">
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader className="bg-muted/60">
                          <TableRow className="border-b border-border hover:bg-transparent">
                            <TableHead className="text-xs font-medium text-muted-foreground">Run ID</TableHead>
                            <TableHead className="text-xs font-medium text-muted-foreground">Status</TableHead>
                            <TableHead className="text-xs font-medium text-muted-foreground">User</TableHead>
                            <TableHead className="text-xs font-medium text-muted-foreground">Created</TableHead>
                            <TableHead className="text-xs font-medium text-muted-foreground">Latency</TableHead>
                            <TableHead className="text-xs font-medium text-muted-foreground">Tokens</TableHead>
                            <TableHead className="text-xs font-medium text-muted-foreground max-w-[200px]">Input</TableHead>
                            <TableHead className="text-xs font-medium text-muted-foreground max-w-[200px]">Actual output</TableHead>
                            <TableHead className="text-xs font-medium text-muted-foreground max-w-[200px]">Expected</TableHead>
                            <TableHead className="sticky right-0 z-20 w-12 border-l border-border/80 bg-white p-2 pr-3 shadow-[-8px_0_16px_-8px_rgba(0,0,0,0.12)] dark:bg-card"><span className="sr-only">Actions</span></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {c.examples.map((ex, i) => {
                            const run = runs.find((r) => r.runId === ex.runId)
                            return (
                              <TableRow key={`${c.id}-ex-${i}`} className="group cursor-pointer hover:bg-muted/50" onClick={() => setSelectedRunId(ex.runId)}>
                                <TableCell className="font-mono text-xs text-muted-foreground">{ex.runId.slice(0, 8)}…</TableCell>
                                <TableCell>
                                  {run && (
                                    <span className={cn(
                                      "rounded px-1.5 py-0.5 text-[10px] font-medium uppercase",
                                      run.status === "error" ? "bg-red-100 text-red-700" : run.status === "running" ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-800"
                                    )}>{run.status}</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground">{run?.user ?? "—"}</TableCell>
                                <TableCell className="text-xs text-muted-foreground">{run?.created ?? "—"}</TableCell>
                                <TableCell className="text-xs text-muted-foreground">{run?.latency ?? "—"}</TableCell>
                                <TableCell className="text-xs text-muted-foreground">{run?.tokens ?? "—"}</TableCell>
                                <TableCell className="max-w-[200px] text-xs text-foreground/80 truncate">{ex.input}</TableCell>
                                <TableCell className="max-w-[200px] font-mono text-xs text-red-600/90 truncate">{ex.output}</TableCell>
                                <TableCell className="max-w-[200px] font-mono text-xs text-green-700/90 truncate">{ex.expected}</TableCell>
                                <TableCell className="sticky right-0 z-20 border-l border-border/80 bg-white p-2 pr-3 shadow-[-8px_0_16px_-8px_rgba(0,0,0,0.12)] dark:bg-card">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 gap-1 px-2 text-xs opacity-0 group-hover:opacity-100"
                                    onClick={(e) => { e.stopPropagation(); setSelectedRunId(ex.runId) }}
                                  >
                                    <Workflow className="h-3 w-3" />
                                    Open
                                  </Button>
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>
              )
            })()}
          </TabsContent>

          <TabsContent value="guardrails" className="mt-0">
            <Guardrails />
          </TabsContent>

        </Tabs>
          </div>
        </div>
      </div>
      <SaveToDatasetModal
        open={saveToDatasetOpen}
        onOpenChange={setSaveToDatasetOpen}
        datasets={saveDatasets}
        setDatasets={setSaveDatasets}
      />
    </div>
    {evaluateRunDialog}
    </>
  )
}
