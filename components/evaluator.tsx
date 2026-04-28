"use client"

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import type { ExperimentRunSeed } from "@/lib/experiment-run-seed"
import type { RunData } from "@/lib/analytics-runs"
import { formatAnalyticsRunTimestamp } from "@/lib/analytics-runs"
import { TabContext } from "@/components/dashboard-layout"
import { cn } from "@/lib/utils"
import { AgentInstructionsCard, AgentPromptCard, AgentPlaceholderSections } from "@/components/agent-node-config-cards"
import {
  AlertCircle,
  BarChart3,
  Calculator,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CloudDownload,
  CloudUpload,
  Copy,
  Maximize2,
  Database,
  EyeOff,
  FileOutput,
  FileText,
  FlaskConical,
  Frown,
  History,
  Info,
  Lock,
  Mail,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Play,
  Plus,
  Settings2,
  Shield,
  Target,
  TextCursorInput,
  Trash2,
  Workflow,
  X,
  Zap,
} from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerTitle,
} from "@/components/ui/drawer"
import { GANTT_NODES, GanttNodeIcon } from "@/components/workflow-gantt"
import { SaveRunToDatabaseModal } from "@/components/save-run-to-database-modal"

// ─── Workflow nodes available for intermediary config ─────────────────────────

type NodeField =
  | { key: string; label: string; type: "select"; options: { value: string; label: string }[] }
  | {
      key: string
      label: string
      type: "textarea"
      placeholder: string
      /** When the saved override is blank, show this as the textarea value (workflow default / binding). */
      inheritedDefault?: string
    }
  | { key: string; label: string; type: "slider"; min: number; max: number; step: number }

export type WorkflowNodeIconKind = "zap" | "database" | "mail"

export type WorkflowNodeDef = {
  id: string
  label: string
  /** Lucide icon key aligned with workflow-gantt node styling */
  iconKind: WorkflowNodeIconKind
  fields: NodeField[]
}

export function WorkflowNodeLucideIcon({
  kind,
  className,
}: {
  kind: WorkflowNodeIconKind
  className?: string
}) {
  const base = "h-3.5 w-3.5 shrink-0 text-muted-foreground"
  switch (kind) {
    case "zap":
      return <Zap className={cn(base, className)} aria-hidden />
    case "database":
      return <Database className={cn(base, className)} aria-hidden />
    case "mail":
      return <Mail className={cn(base, className)} aria-hidden />
    default:
      return null
  }
}

export const WORKFLOW_NODES: WorkflowNodeDef[] = [
  {
    id: "ai-agent",
    label: "AI Agent",
    iconKind: "zap",
    fields: [
      {
        key: "system_prompt",
        label: "Instructions",
        type: "textarea",
        placeholder: "You are a helpful assistant…",
      },
      {
        key: "user_prompt",
        label: "Prompt",
        type: "textarea",
        placeholder: "Add prompt text…",
      },
      {
        key: "model",
        label: "Model",
        type: "select",
        options: [
          { value: "gpt-4o", label: "GPT-4o" },
          { value: "gpt-4.1", label: "GPT-4.1" },
          { value: "gpt-4o-mini", label: "GPT-4o mini" },
          { value: "claude-opus-4-6", label: "Claude Opus 4.6" },
          { value: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
          { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
        ],
      },
      {
        key: "temperature",
        label: "Temperature",
        type: "slider",
        min: 0,
        max: 1,
        step: 0.1,
      },
    ],
  },
  {
    id: "knowledge-base",
    label: "Knowledge Base",
    iconKind: "database",
    fields: [
      {
        key: "kb",
        label: "Knowledge base",
        type: "select",
        options: [
          { value: "kb-1", label: "Product docs v2" },
          { value: "kb-2", label: "Support articles" },
          { value: "kb-3", label: "Internal wiki" },
        ],
      },
      {
        key: "top_k",
        label: "Top K results",
        type: "select",
        options: [
          { value: "3", label: "3" },
          { value: "5", label: "5" },
          { value: "10", label: "10" },
        ],
      },
      {
        key: "query_override",
        label: "Query override",
        type: "textarea",
        placeholder: "Leave blank to use default query…",
        inheritedDefault:
          "{{ticket.subject}}\n{{ticket.body}}\n\nRetrieve concise passages from the selected knowledge bases that best answer the ticket. Prefer official policy and troubleshooting steps.",
      },
    ],
  },
  {
    id: "send-email",
    label: "Send Email",
    iconKind: "mail",
    fields: [
      {
        key: "to",
        label: "To",
        type: "textarea",
        placeholder: "recipient@example.com",
      },
      {
        key: "subject",
        label: "Subject",
        type: "textarea",
        placeholder: "Email subject…",
      },
    ],
  },
]

type WorkflowEvalSource =
  | "output-1"
  | "output-2"
  | (typeof WORKFLOW_NODES)[number]["id"]
  | (typeof GANTT_NODES)[number]["id"]

type GanttWorkflowOutputId = (typeof GANTT_NODES)[number]["id"]

/** Which workflow output terminal feeds an experiment column (mock-backed). */
type ExperimentColumnOutput = WorkflowEvalSource | GanttWorkflowOutputId

/** Gantt node id — Output — default terminal for new / unset experiment columns. */
const DEFAULT_EXPERIMENT_COLUMN_OUTPUT: ExperimentColumnOutput = "10"

/** Workflow node rows hidden from the column output picker (prototype UX). */
const WORKFLOW_NODE_IDS_HIDDEN_IN_EXPERIMENT_COLUMN_OUTPUT = new Set<string>(["ai-agent", "knowledge-base", "send-email"])

function getExperimentColumnOutputLabel(columnOutput: string): string {
  if (columnOutput === "output-1") return "Output 1"
  if (columnOutput === "output-2") return "Output 2"
  const gantt = GANTT_NODES.find((n) => n.id === columnOutput)
  if (gantt) return gantt.label
  const n = WORKFLOW_NODES.find((x) => x.id === columnOutput)
  return n?.label ?? "Node output"
}

function parseOutputForForm(output: string): { evalSource: WorkflowEvalSource } {
  const o = output.trim()
  if (/^output\s*2$/i.test(o) || /^output 2$/i.test(o)) {
    return { evalSource: "output-2" }
  }
  if (/^output\s*1$/i.test(o) || /^output 1$/i.test(o)) {
    return { evalSource: "output-1" }
  }
  if (/^workflow output$/i.test(o) || /^full workflow/i.test(o)) {
    return { evalSource: "output-1" }
  }
  const ganttById = GANTT_NODES.find((n) => o === n.id)
  if (ganttById) return { evalSource: ganttById.id as WorkflowEvalSource }
  const arrow = o.match(/^(.+?)\s*(?:→|->)\s*output\s*$/i)
  if (arrow) {
    const left = arrow[1].trim()
    const gantt = GANTT_NODES.find(
      (n) => left === n.label || left.includes(n.label) || n.label.includes(left),
    )
    if (gantt) return { evalSource: gantt.id as WorkflowEvalSource }
    const found = WORKFLOW_NODES.find(
      (n) => left === n.label || left.includes(n.label) || n.label.includes(left),
    )
    if (found) return { evalSource: found.id }
    return { evalSource: "output-1" }
  }
  for (const n of GANTT_NODES) {
    if (o === `${n.label} output` || o === n.label) {
      return { evalSource: n.id as WorkflowEvalSource }
    }
    if (o.startsWith(n.label) && o.length < n.label.length + 24) {
      return { evalSource: n.id as WorkflowEvalSource }
    }
  }
  for (const n of WORKFLOW_NODES) {
    if (o === `${n.label} output` || (o.startsWith(n.label) && o.length < n.label.length + 16)) {
      return { evalSource: n.id }
    }
  }
  if (/\boutput\b/i.test(o) && !/workflow/i.test(o)) {
    return { evalSource: "output-1" }
  }
  return { evalSource: "output-1" }
}

/** Icon for "What to evaluate": workflow nodes use their node icon; Output 1 / 2 use a file-output glyph. */
function EvaluatedSourceIcon({
  evalSource,
  className,
  size = "sm",
}: {
  evalSource: WorkflowEvalSource
  className?: string
  size?: "sm" | "md"
}) {
  const dim = size === "md" ? "h-4 w-4" : "h-3.5 w-3.5"
  const iconClass = cn(dim, "shrink-0 text-muted-foreground", className)
  if (evalSource === "output-1" || evalSource === "output-2") {
    return <FileOutput className={iconClass} aria-hidden />
  }
  const g = GANTT_NODES.find((x) => x.id === evalSource)
  if (g) {
    return (
      <span className={cn("inline-flex shrink-0 items-center justify-center", className)} aria-hidden>
        <GanttNodeIcon type={g.icon} />
      </span>
    )
  }
  const n = WORKFLOW_NODES.find((x) => x.id === evalSource)
  if (n) return <WorkflowNodeLucideIcon kind={n.iconKind} className={iconClass} />
  return <FileOutput className={iconClass} aria-hidden />
}

function outputLabelFromEvalSource(evalSource: WorkflowEvalSource): string {
  if (evalSource === "output-1") return "Output 1"
  if (evalSource === "output-2") return "Output 2"
  const g = GANTT_NODES.find((x) => x.id === evalSource)
  if (g) return `${g.label} → output`
  const n = WORKFLOW_NODES.find((x) => x.id === evalSource)
  return n ? `${n.label} output` : "Output 1"
}

/** Same visible label as the "What to evaluate" Select (must agree with `parseOutputForForm`). */
function evaluatedSelectLabelFromOutput(output: string): string {
  const o = output.trim()
  if (!o) return "—"
  const { evalSource } = parseOutputForForm(o)
  if (evalSource === "output-1") return "Output 1"
  if (evalSource === "output-2") return "Output 2"
  const g = GANTT_NODES.find((x) => x.id === evalSource)
  if (g) return g.label
  const n = WORKFLOW_NODES.find((x) => x.id === evalSource)
  return n?.label ?? o
}

/** Canvas / graph nodes the user can "pin" for this experiment column (prototype). */
const PINNABLE_NODES: { id: string; label: string }[] = [
  { id: "pin-text-input", label: "Text Input" },
  { id: "pin-ai-agent", label: "AI Agent" },
  { id: "pin-knowledge-base", label: "Knowledge Base" },
  { id: "pin-condition", label: "Condition" },
  { id: "pin-output", label: "Output" },
]

type NodeConfig = {
  nodeId: string
  values: Record<string, string>
}

// ─── Experiment Tab ────────────────────────────────────────────────────────────

type EvaluatorConfig = {
  id: number
  name: string
  output: string
  type: string
  expected: string
  /** Model used when type is LLM judge (prototype). */
  judgeModel?: string
  /** When this evaluator runs (auto vs manual, schedule, pipeline step). */
  runWhen: string
  /** Which runs / rows it applies to (sample %, user_id, env, etc.). */
  runScope: string
  ran: string
  /** Pass/fail threshold as a raw 0–100 score (displayed as 0–10). Runs below this are flagged red. */
  passThreshold?: number
}

type EvaluatorDef = {
  id: string
  label: string
  type: "score" | "reference"
  /** "Evaluation type" from the evaluator dialog (e.g. LLM judge, Expected Output). */
  evaluationType: string
  /** Pass/fail threshold as raw 0–100. Scores below this are shown red. */
  passThreshold?: number
}

type Variant = {
  id: string
  label: string
  /** Baseline workflow for this column; overridden when the user saves changes in the variant sheet */
  workflow: NodeConfig
  /** Subset of workflow graph nodes pinned for this column (UX prototype). */
  pinnedNodeIds?: string[]
  /** When the graph has multiple outputs, choose which terminal populates this column. */
  columnOutput?: ExperimentColumnOutput
}

type TestCase = {
  id: string
  input: string
  expected: string
  /** When this row came from a real/logged workflow run, link to Analytics → Run Details. */
  sourceRunId?: string
}

// ─── Mock data ─────────────────────────────────────────────────────────────────

const INITIAL_EVALUATORS_DEF: EvaluatorDef[] = [
  { id: "ev-2", label: "Tone & empathy", type: "score", evaluationType: "LLM judge", passThreshold: 60 },
  { id: "ev-3", label: "Resolution completeness", type: "score", evaluationType: "LLM judge", passThreshold: 70 },
  { id: "ev-1", label: "Response accuracy", type: "reference", evaluationType: "Expected Output" },
]

/** Same strings as the Evaluators tab list — use for cross-tab mocks (e.g. Analytics run rows). */
export const EVALUATOR_DISPLAY_LABELS: readonly string[] = INITIAL_EVALUATORS_DEF.map((e) => e.label)

/** Maps evaluator label → pass threshold (raw 0–100). Used by Analytics table for score coloring. */
export const EVALUATOR_PASS_THRESHOLDS: Readonly<Record<string, number>> = Object.fromEntries(
  INITIAL_EVALUATORS_DEF.flatMap((e) => e.passThreshold != null ? [[e.label, e.passThreshold]] : [])
)

/** Saved workflow snapshots the user can attach to a variant column (prototype). */
const WORKFLOW_VERSION_CHOICES: { id: string; label: string; hint: string }[] = [
  { id: "wf-snap-4", label: "v4 — Current (Apr 18, 2026)", hint: "Published graph; matches production." },
  { id: "wf-snap-3", label: "v3 — Mar 2, 2026", hint: "Before the email step was added." },
  { id: "wf-snap-2", label: "v2 — Feb 4, 2026", hint: "Earlier KB retrieval settings." },
  { id: "wf-snap-1", label: "v1 — Jan 10, 2026", hint: "Original baseline workflow." },
]

/** Fixed baseline column: mirrors the live workflow; not editable in the experiment UI. */
const BASELINE_VARIANT_ID = "v-1"

const INITIAL_VARIANTS: Variant[] = [
  {
    id: BASELINE_VARIANT_ID,
    label: "Output",
    workflow: {
      nodeId: "ai-agent",
      values: {
        model: "gpt-4o-mini",
        system_prompt: "You are a concise customer support agent. Classify incoming tickets, search the knowledge base, and draft a clear, empathetic reply. Escalate billing disputes and critical bugs to a human agent.",
        user_prompt:
          "Classify the ticket, pull relevant articles if needed, and draft a reply that matches our support tone.",
        temperature: "0.2",
      },
    },
  },
]

function getEffectiveNodeConfig(variant: Variant, overrides: Record<string, NodeConfig>): NodeConfig {
  const o = overrides[variant.id]
  if (o?.nodeId) return o
  return variant.workflow
}

/** Labels + preview for the experiment column header */
function getVariantHeaderSummary(variant: Variant, overrides: Record<string, NodeConfig>): {
  node: WorkflowNodeDef | undefined
  modelLabel: string | null
  temperature: string | null
  promptFull: string | null
} {
  const cfg = getEffectiveNodeConfig(variant, overrides)
  const node = WORKFLOW_NODES.find((n) => n.id === cfg.nodeId)
  const values = cfg.values ?? {}

  if (!node) {
    return { node: undefined, modelLabel: null, temperature: null, promptFull: null }
  }

  if (node.id === "ai-agent") {
    const modelField = node.fields.find((f) => f.key === "model")
    let modelLabel: string | null = null
    if (modelField?.type === "select" && values.model) {
      const opt = modelField.options.find((o) => o.value === values.model)
      modelLabel = opt?.label ?? values.model
    } else if (values.model) {
      modelLabel = values.model
    }
    const temperature =
      values.temperature != null && String(values.temperature).trim() !== "" ? String(values.temperature) : null
    const raw = values.system_prompt?.trim() ?? ""
    const promptFull = raw.length > 0 ? raw : null
    return { node, modelLabel, temperature, promptFull }
  }

  const bits: string[] = []
  for (const field of node.fields.slice(0, 3)) {
    const v = values[field.key]?.trim()
    if (!v) continue
    if (field.type === "select") {
      const opt = field.options.find((o) => o.value === v)
      bits.push(opt?.label ?? v)
    } else {
      bits.push(v.length > 40 ? `${v.slice(0, 40)}…` : v)
    }
  }
  const joined = bits.length ? bits.join(" · ") : null
  return { node, modelLabel: joined, temperature: null, promptFull: null }
}

function displayNodeConfigValue(node: WorkflowNodeDef, key: string, raw: string): string {
  const field = node.fields.find((f) => f.key === key)
  const s = raw?.trim() ?? ""
  if (!s) return "—"
  if (field?.type === "select" && field.options) {
    return field.options.find((o) => o.value === s)?.label ?? s
  }
  if (field?.type === "textarea" || key === "system_prompt") {
    return s.length > 44 ? `${s.slice(0, 41)}…` : s
  }
  return s
}

/** Human-readable bullets: how this column differs from the baseline experiment column. */
function getVariantDiffTooltipLines(
  baseline: Variant,
  variant: Variant,
  nodeConfigs: Record<string, NodeConfig>,
  workflowSnapshotByVariantId: Record<string, string>,
): string[] {
  const lines: string[] = []
  const bCfg = getEffectiveNodeConfig(baseline, nodeConfigs)
  const vCfg = getEffectiveNodeConfig(variant, nodeConfigs)
  const bNode = WORKFLOW_NODES.find((n) => n.id === bCfg.nodeId)
  const vNode = WORKFLOW_NODES.find((n) => n.id === vCfg.nodeId)

  if (bCfg.nodeId !== vCfg.nodeId) {
    lines.push(`Node: ${bNode?.label ?? bCfg.nodeId} → ${vNode?.label ?? vCfg.nodeId}`)
  }

  if (vNode && bCfg.nodeId === vCfg.nodeId) {
    const bVals = bCfg.values ?? {}
    const vVals = vCfg.values ?? {}
    const keys = new Set([...Object.keys(bVals), ...Object.keys(vVals)])
    for (const key of keys) {
      const a = bVals[key] ?? ""
      const c = vVals[key] ?? ""
      if (a === c) continue
      const field = vNode.fields.find((f) => f.key === key)
      const label = field?.label ?? key
      if (field?.type === "textarea" || key === "system_prompt") {
        lines.push(`${label} differs from baseline`)
      } else {
        lines.push(
          `${label}: ${displayNodeConfigValue(vNode, key, a)} → ${displayNodeConfigValue(vNode, key, c)}`,
        )
      }
    }
  } else if (vNode && bCfg.nodeId !== vCfg.nodeId) {
    for (const field of vNode.fields.slice(0, 5)) {
      const raw = (vCfg.values ?? {})[field.key]
      if (raw == null || String(raw).trim() === "") continue
      lines.push(`${field.label}: ${displayNodeConfigValue(vNode, field.key, String(raw))}`)
    }
  }

  const bOut = baseline.columnOutput ?? DEFAULT_EXPERIMENT_COLUMN_OUTPUT
  const vOut = variant.columnOutput ?? DEFAULT_EXPERIMENT_COLUMN_OUTPUT
  if (bOut !== vOut) {
    lines.push(`Output terminal: ${getExperimentColumnOutputLabel(bOut)} → ${getExperimentColumnOutputLabel(vOut)}`)
  }

  const snapDefault = WORKFLOW_VERSION_CHOICES[0]?.id ?? ""
  const snapB = workflowSnapshotByVariantId[baseline.id] ?? snapDefault
  const snapV = workflowSnapshotByVariantId[variant.id] ?? snapDefault
  if (snapB !== snapV) {
    const meta = WORKFLOW_VERSION_CHOICES.find((s) => s.id === snapV)
    lines.push(`Workflow version: ${meta?.label ?? snapV}`)
  }

  const pins = variant.pinnedNodeIds?.length
    ? variant.pinnedNodeIds
        .map((id) => PINNABLE_NODES.find((p) => p.id === id)?.label ?? id)
        .join(", ")
    : ""
  const basePins = baseline.pinnedNodeIds?.length
    ? baseline.pinnedNodeIds
        .map((id) => PINNABLE_NODES.find((p) => p.id === id)?.label ?? id)
        .join(", ")
    : ""
  if (pins !== basePins) {
    if (pins) lines.push(`Pinned nodes: ${pins}`)
    else lines.push("Pinned nodes: cleared vs baseline")
  }

  return lines.length > 0 ? lines : ["Matches baseline configuration"]
}

// ─── Mock datasets ─────────────────────────────────────────────────────────────

type DatasetRow = { input: string; expected: string }
type Dataset    = { id: string; name: string; rows: DatasetRow[] }

const MOCK_DATASETS: Dataset[] = [
  {
    id: "ds-1",
    name: "Billing disputes",
    rows: [
      { input: "I was charged twice for my Pro subscription this month. I've emailed support 3 times with no response.", expected: '{"intent":"billing_dispute","priority":"high","action":"escalate_to_billing","sentiment":"frustrated"}' },
      { input: "My card was declined when trying to upgrade to the Business plan.", expected: '{"intent":"payment_failure","priority":"medium","action":"resend_payment_link","sentiment":"neutral"}' },
      { input: "Can I get a prorated refund if I downgrade mid-cycle?", expected: '{"intent":"refund_request","priority":"low","action":"send_policy_doc","sentiment":"curious"}' },
      { input: "I cancelled my account last week but was still charged for the next month.", expected: '{"intent":"billing_dispute","priority":"high","action":"escalate_to_billing","sentiment":"frustrated"}' },
    ],
  },
  {
    id: "ds-2",
    name: "Technical issues",
    rows: [
      { input: "The chatbot widget isn't loading on our website after the latest update.", expected: '{"intent":"bug_report","priority":"high","action":"escalate_to_engineering","sentiment":"frustrated"}' },
      { input: "How do I reset my API key?", expected: "Go to Settings → API Keys → Regenerate. Note: your old key will be revoked immediately." },
      { input: "Email notifications stopped working after I changed my account email.", expected: '{"intent":"bug_report","priority":"medium","action":"escalate_to_engineering","sentiment":"neutral"}' },
    ],
  },
  {
    id: "ds-3",
    name: "Account & access",
    rows: [
      { input: "I can't log in — the password reset email never arrived. I've checked spam.", expected: '{"intent":"auth_issue","priority":"medium","action":"manual_reset","sentiment":"frustrated"}' },
      { input: "Can I add two more team members to my current Business plan?", expected: '{"intent":"seat_management","priority":"low","action":"send_upgrade_info","sentiment":"curious"}' },
    ],
  },
]

/** Logged workflow runs — prototype list for "use input from a past run". */
type LoggedRunRow = { id: string; label: string; meta: string; input: string; expected: string }

const MOCK_LOGGED_RUNS: LoggedRunRow[] = [
  {
    id: "lr-1",
    label: "Run #4821",
    meta: "Dec 4, 2025 · staging",
    input: "Customer says they were double-charged after upgrading to Business — please investigate and refund if valid.",
    expected: '{"intent":"billing_dispute","priority":"high","action":"escalate_to_billing","sentiment":"frustrated"}',
  },
  {
    id: "lr-2",
    label: "Run #4798",
    meta: "Dec 3, 2025 · production",
    input: "Widget shows a blank screen on Safari 17; works in Chrome.",
    expected: '{"intent":"bug_report","priority":"high","action":"escalate_to_engineering","sentiment":"neutral"}',
  },
  {
    id: "lr-3",
    label: "Run #4762",
    meta: "Dec 2, 2025 · production",
    input: "Need SSO enforced for all workspace admins by end of week.",
    expected: '{"intent":"security_request","priority":"medium","action":"send_sso_guide","sentiment":"urgent"}',
  },
]

/** Receive Email trigger: sample payloads (label is UI only; `payload` is stored on the case). */
const EXPERIMENT_TRIGGER_PAYLOAD_SAMPLES: { label: string; description: string; payload: string }[] = [
  {
    label: "New Slack message",
    description: "User message in #general",
    payload: `{\n  "event": "message",\n  "channel": "#general",\n  "user": "U012AB3CD",\n  "text": "Hello team!",\n  "ts": "1734000000.000100"\n}`,
  },
  {
    label: "Form submission",
    description: "Contact form via webhook",
    payload: `{\n  "event": "form_submit",\n  "name": "Jane Doe",\n  "email": "jane@example.com",\n  "message": "I'd like a demo.",\n  "submitted_at": "2025-12-04T11:25:00Z"\n}`,
  },
  {
    label: "Scheduled run",
    description: "Cron trigger, no payload",
    payload: `{\n  "event": "schedule",\n  "cron": "0 9 * * 1-5",\n  "triggered_at": "2025-12-04T09:00:00Z"\n}`,
  },
]

function experimentTriggerPayloadForDisplay(stored: string): string {
  const row = EXPERIMENT_TRIGGER_PAYLOAD_SAMPLES.find((p) => p.label === stored || p.payload === stored)
  return row?.payload ?? stored
}

/** Default matrix: one empty row; mock run output still maps via `experimentMockBackingCaseId` → demo row c-1. */
const INITIAL_CASES: TestCase[] = [{ id: "c-default", input: "", expected: "" }]

/** Prototype: default experiment rows → existing Analytics mock runs (Gantt / Run Details). */
const DEMO_ANALYTICS_RUN_ID_BY_CASE_ID: Record<string, string> = {
  /** Same run as Analytics overview policy signal (yellow row) — aligns experiment “View run” + score chips. */
  "c-1": "c3d4e5f6-a7b8-9012-cdef-123456789012",
  "c-2": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "c-3": "a7b8c9d0-e1f2-3456-0123-567890123456",
  "c-4": "b8c9d0e1-f2a3-4567-1234-678901234567",
}

// Mock outputs: [caseId][variantId] → output string
const MOCK_CELL_OUTPUTS: Record<string, Record<string, string>> = {
  "c-1": {
    "v-1": '{"intent":"billing_dispute","priority":"medium","action":"send_faq","sentiment":"neutral"}',
    "v-2": '{"intent":"billing_dispute","priority":"high","action":"escalate_to_billing","sentiment":"frustrated"}',
    "v-3": '{"intent":"billing_dispute","priority":"high","action":"escalate_to_billing","sentiment":"frustrated"}',
    "v-1__output-2":
      "[Output 2 — router] {\"route\":\"risk_engine\",\"duplicate_charge\":true,\"suggested_queue\":\"billing_tier2\"}",
    "v-2__output-2":
      "[Output 2 — router] {\"route\":\"billing_ops\",\"confidence\":0.94,\"auto_reply_allowed\":false}",
    "v-3__output-2":
      "[Output 2 — router] {\"route\":\"billing_ops\",\"confidence\":0.97,\"auto_reply_allowed\":false,\"case_id\":\"CHG-9021\"}",
  },
  "c-2": {
    "v-1": "The chatbot widget issue is noted. Please try clearing your cache and reloading the page.",
    "v-2": "I'm sorry for the disruption. This sounds related to a known issue after our latest release. I've escalated it to engineering as high priority and will send updates as they come in.",
    "v-3": "Apologies for the disruption. I've flagged this as a high-priority bug and escalated it to our engineering team. A hard refresh (Ctrl+Shift+R) may restore functionality temporarily. You'll receive a status update within 2 hours.",
    "v-1__output-2":
      "[Output 2 — internal] Widget load failure bucket: CDN; assigned component \"embed-loader\"; no customer reply.",
    "v-2__output-2":
      "[Output 2 — internal] Incident INC-883 linked; comms template \"widget_outage_v3\" queued for approval.",
    "v-3__output-2":
      "[Output 2 — internal] SEV-2 ticket created; ETA comms scheduled + customer-facing draft held until eng sign-off.",
  },
  "c-3": {
    "v-1": "Please check your spam folder and try requesting the reset again.",
    "v-2": "I understand how frustrating this is. Let me manually trigger a password reset for your account — you should receive the email within 5 minutes. If it still doesn't arrive, I can set a temporary password directly.",
    "v-3": "I'm sorry you're having trouble. I've manually triggered a new reset email — it should arrive within a few minutes. If you still don't receive it, please reply and I'll set a temporary password so you can get back in right away.",
    "v-1__output-2":
      "[Output 2 — auth pipeline] signal=low_deliverability; last_provider_event=bounced; agent_assist=none",
    "v-2__output-2":
      "[Output 2 — auth pipeline] manual_reset=queued; mfa_challenge=skipped; audit_ref=AUTH-2218",
    "v-3__output-2":
      "[Output 2 — auth pipeline] manual_reset=sent; temp_password_offer=armed; sla_breach=false",
  },
  "c-4": {
    "v-1": "Yes, you can downgrade your plan. Refunds depend on your billing cycle.",
    "v-2": "Great question! If you downgrade mid-cycle, you'll receive a prorated credit for the unused days, applied automatically to your next invoice. I've attached our billing FAQ with full details.",
    "v-3": "Yes — if you downgrade mid-cycle, you'll receive a prorated credit for the remaining days, automatically applied to your next billing cycle. No action needed on your end; the adjustment happens automatically. Let me know if you'd like more detail on how the proration is calculated.",
    "v-1__output-2":
      "[Output 2 — escalation summary] Billing: downgrade question detected; suggested macro \"proration_policy_v2\"; no customer-facing reply drafted.",
    "v-2__output-2":
      "[Output 2 — escalation summary] Same intent as main reply; includes internal ticket #B-44102 and assigns owner \"Billing L2\".",
    "v-3__output-2":
      "[Output 2 — escalation summary] Proration FAQ link staged for agent; customer email left in \"pending review\" state.",
  },
}

// Mock scores: [caseId][variantId][evalId]
const MOCK_CELL_SCORES: Record<string, Record<string, Record<string, number>>> = {
  "c-1": {
    "v-1": { "ev-1": 48, "ev-2": 46, "ev-3": 52 },
    "v-2": { "ev-1": 96, "ev-2": 94, "ev-3": 88 },
    "v-3": { "ev-1": 94, "ev-2": 92, "ev-3": 85 },
  },
  "c-2": {
    "v-1": { "ev-1": 62, "ev-2": 58, "ev-3": 58 },
    "v-2": { "ev-1": 91, "ev-2": 93, "ev-3": 94 },
    "v-3": { "ev-1": 95, "ev-2": 96, "ev-3": 97 },
  },
  "c-3": {
    "v-1": { "ev-1": 55, "ev-2": 52, "ev-3": 49 },
    "v-2": { "ev-1": 93, "ev-2": 94, "ev-3": 96 },
    "v-3": { "ev-1": 97, "ev-2": 98, "ev-3": 98 },
  },
  "c-4": {
    "v-1": { "ev-1": 70, "ev-2": 68, "ev-3": 65 },
    "v-2": { "ev-1": 88, "ev-2": 90, "ev-3": 92 },
    "v-3": { "ev-1": 91, "ev-2": 93, "ev-3": 94 },
  },
}

// Mock LLM judge explanations: [caseId][variantId][evalId]
const MOCK_CELL_EXPLANATIONS: Record<string, Record<string, Record<string, string>>> = {
  "c-1": {
    "v-1": {
      "ev-1": "Score 4.8/10 — The output misclassifies priority as medium when the ticket clearly signals high frustration and a repeated billing failure. The action send_faq is insufficient for a dispute that has gone unacknowledged three times.",
      "ev-2": "Score 4.6/10 — The response does not acknowledge the customer's frustration or the repeated contact attempts. Tone is transactional and fails to meet the empathy threshold required for priority:high tickets.",
      "ev-3": "Score 5.2/10 — The reply does not resolve the issue or provide a clear next step toward a refund or escalation. A generic FAQ link leaves the customer without a concrete path forward.",
    },
    "v-2": {
      "ev-1": "Score 9.6/10 — Intent, priority, and action are all correctly identified. The output correctly routes to escalate_to_billing, matching the gold label exactly.",
      "ev-2": "Score 9.4/10 — The response opens with an empathetic acknowledgment and takes clear ownership. Tone is warm and appropriately urgent for a high-priority billing dispute.",
      "ev-3": "Score 8.8/10 — The reply commits to a concrete next step and sets clear expectations. Could mention a specific resolution timeline to fully close the loop.",
    },
    "v-3": {
      "ev-1": "Score 9.4/10 — Classification is accurate across all fields. Minor deduction for not surfacing the ticket_id in the structured output.",
      "ev-2": "Score 9.2/10 — Empathy is well-calibrated and the tone matches the urgency of the dispute. The phrase 'I understand how frustrating' lands naturally here.",
      "ev-3": "Score 8.5/10 — Resolution path is clear and the customer knows what to expect next. A reference to the specific charge amount would strengthen completeness.",
    },
  },
  "c-2": {
    "v-1": {
      "ev-1": "Score 6.2/10 — The reply acknowledges the issue but the suggested fix (clearing cache) is unlikely to resolve a server-side widget loading failure. Escalation was not triggered despite high priority signals.",
      "ev-2": "Score 5.8/10 — The response is neutral in tone but lacks any acknowledgment of the business impact of a broken chatbot widget. No empathy for the disruption expressed.",
      "ev-3": "Score 5.8/10 — The self-serve cache-clearing advice does not constitute a resolution. No follow-up commitment or escalation path was provided.",
    },
    "v-2": {
      "ev-1": "Score 9.1/10 — Correctly identifies the issue as a known engineering bug and escalates appropriately. The escalation trigger fires as expected.",
      "ev-2": "Score 9.3/10 — Opens with a sincere apology and takes clear ownership of the problem. Tone is professional and reassuring throughout.",
      "ev-3": "Score 9.4/10 — Provides a temporary workaround, escalates to engineering, and commits to status updates. All resolution criteria are met.",
    },
    "v-3": {
      "ev-1": "Score 9.5/10 — Escalation is correct and the structured output matches expected classification. The 2-hour update commitment adds measurable accountability.",
      "ev-2": "Score 9.6/10 — Tone is warm and confident. The hard refresh tip is framed as a temporary measure, not a dismissal, which is the right nuance.",
      "ev-3": "Score 9.7/10 — The reply fully resolves the immediate concern, provides a concrete workaround, and sets a clear follow-up expectation. Excellent completeness.",
    },
  },
  "c-3": {
    "v-1": {
      "ev-1": "Score 5.5/10 — The advice to check spam is generic and unhelpful when the customer has already stated they checked. No manual intervention was offered.",
      "ev-2": "Score 5.2/10 — The response is abrupt and does not acknowledge the frustration of being locked out. No empathy marker is present.",
      "ev-3": "Score 4.9/10 — Suggesting the customer re-request the reset email does not resolve the issue. A direct manual reset or temporary password should have been offered.",
    },
    "v-2": {
      "ev-1": "Score 9.3/10 — Correctly identifies the need for manual intervention and acts on it immediately. The 5-minute ETA is a clear and verifiable commitment.",
      "ev-2": "Score 9.4/10 — The opening empathy statement is genuine and specific to the lockout scenario. Tone remains calm and in control throughout.",
      "ev-3": "Score 9.6/10 — The reply triggers a manual reset, provides a time estimate, and offers a fallback. All resolution criteria are satisfied.",
    },
    "v-3": {
      "ev-1": "Score 9.7/10 — Manual reset is triggered and the fallback (temporary password) is pre-emptively offered. Classification and action are both correct.",
      "ev-2": "Score 9.8/10 — Empathy is expressed naturally and the response feels human rather than scripted. The follow-up offer is proactive and appropriate.",
      "ev-3": "Score 9.8/10 — Fully resolves the issue with a clear action, a time expectation, and an explicit fallback path. Nothing left ambiguous for the customer.",
    },
  },
  "c-4": {
    "v-1": {
      "ev-1": "Score 7.0/10 — The response is technically correct but vague. 'Refunds depend on your billing cycle' does not tell the customer what to actually expect.",
      "ev-2": "Score 6.8/10 — Tone is neutral but the opening 'Yes, you can' is abrupt and misses an opportunity to reassure the customer proactively.",
      "ev-3": "Score 6.5/10 — The answer is incomplete — no mention of how the prorated credit works or where it applies. The customer is left to follow up.",
    },
    "v-2": {
      "ev-1": "Score 8.8/10 — Prorated credit is correctly explained and the process is described accurately. Minor deduction for the informal 'Great question!' opener.",
      "ev-2": "Score 9.0/10 — Tone is friendly and helpful. The FAQ attachment is a good complement to the explanation.",
      "ev-3": "Score 9.2/10 — Resolution is complete: the customer understands the credit mechanism, timing, and that no action is required on their end.",
    },
    "v-3": {
      "ev-1": "Score 9.1/10 — Explanation is accurate and clearly worded. The 'No action needed' reassurance directly addresses a common follow-up question.",
      "ev-2": "Score 9.3/10 — Tone is confident and warm without being informal. The offer to explain the proration formula is a nice proactive touch.",
      "ev-3": "Score 9.4/10 — The reply fully answers the question, explains the automatic credit, and invites further questions. Completeness is high.",
    },
  },
}

// Mock reference match: [caseId][variantId]
const MOCK_CELL_MATCH: Record<string, Record<string, boolean>> = {
  "c-1": { "v-1": false, "v-2": true,  "v-3": true  },
  "c-2": { "v-1": false, "v-2": false, "v-3": false },
  "c-3": { "v-1": false, "v-2": false, "v-3": true  },
  "c-4": { "v-1": false, "v-2": false, "v-3": false },
}

/** Run-progress / Compare seeds use ad-hoc case ids (e.g. `c-run-…`) with no mock row; map those onto the first demo matrix row so cells stay populated after a run. */
function experimentMockBackingCaseId(caseId: string): string {
  return MOCK_CELL_OUTPUTS[caseId] ? caseId : "c-1"
}

/** Sync with `OVERVIEW_SIGNALS` runIds in `components/analytics.tsx`. */
const ANALYTICS_SIGNAL_LINKED_RUN_IDS = new Set<string>([
  "c3d4e5f6-a7b8-9012-cdef-123456789012",
  "d0e1f2a3-b4c5-6789-3456-890123456789",
])

function analyticsRunIdForExperimentCase(tc: TestCase): string | null {
  if (tc.sourceRunId) return tc.sourceRunId
  const explicit = DEMO_ANALYTICS_RUN_ID_BY_CASE_ID[tc.id]
  if (explicit) return explicit
  const backing = experimentMockBackingCaseId(tc.id)
  return DEMO_ANALYTICS_RUN_ID_BY_CASE_ID[backing] ?? null
}

function experimentCaseLinkedToAnalyticsSignal(tc: TestCase): boolean {
  const id = analyticsRunIdForExperimentCase(tc)
  return id != null && ANALYTICS_SIGNAL_LINKED_RUN_IDS.has(id)
}

const EXPERIMENT_COLUMN_OUTPUT_ALT_SUFFIX = "__output-2"

const KNOWN_MOCK_EXPERIMENT_VARIANT_IDS = new Set<string>(["v-1", "v-2", "v-3"])

/** Map dynamic Compare column ids onto seeded mock keys (v-1 / v-2 / v-3) by column order. */
function resolveExperimentMockVariantKey(variantId: string, columnIndex: number): string {
  if (KNOWN_MOCK_EXPERIMENT_VARIANT_IDS.has(variantId)) return variantId
  const pool = ["v-1", "v-2", "v-3"] as const
  return pool[Math.min(Math.max(columnIndex, 0), pool.length - 1)]
}

/** Resolves mock cell text for the chosen workflow output terminal (`columnOutput`). */
function getExperimentMockOutput(caseId: string, variant: Variant, mockVariantKey: string): string | undefined {
  const row = MOCK_CELL_OUTPUTS[experimentMockBackingCaseId(caseId)]
  if (!row) return undefined
  const columnOutput = variant.columnOutput ?? DEFAULT_EXPERIMENT_COLUMN_OUTPUT
  const useAlt = columnOutput !== DEFAULT_EXPERIMENT_COLUMN_OUTPUT
  if (useAlt) {
    const altKey = `${mockVariantKey}${EXPERIMENT_COLUMN_OUTPUT_ALT_SUFFIX}`
    return row[altKey] ?? row[mockVariantKey]
  }
  return row[mockVariantKey]
}

// ─── Small helpers ─────────────────────────────────────────────────────────────

/** Raw scores are 0–100; display as 0–10 with one decimal (e.g. 7.0, 8.1). */
function formatScoreTenPoint(score: number) {
  return (score / 10).toFixed(1)
}

function hashStringToSeed(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

/**
 * Experiment table scores are seeded in MOCK_CELL_SCORES for built-in eval ids only.
 * User-created evaluators get stable preview scores derived from the same demo row.
 */
function resolveExperimentCellScore(
  mockCaseId: string,
  variantId: string,
  mockVKey: string,
  evalId: string,
): number | null {
  const row = MOCK_CELL_SCORES[mockCaseId]
  if (!row) return null
  const direct = row[variantId]?.[evalId] ?? row[mockVKey]?.[evalId]
  if (direct != null) return direct
  const variantScores = row[variantId] ?? row[mockVKey]
  if (!variantScores) return null
  const anchor =
    variantScores["ev-2"] ??
    variantScores["ev-1"] ??
    variantScores["ev-3"] ??
    (Object.values(variantScores).find((x) => typeof x === "number") as number | undefined) ??
    72
  const jitter = (hashStringToSeed(`${mockCaseId}:${mockVKey}:${evalId}`) % 19) - 9
  return Math.min(100, Math.max(28, anchor + jitter))
}

function resolveExperimentCellExplanation(
  mockCaseId: string,
  variantId: string,
  mockVKey: string,
  evalId: string,
  evalLabel: string,
): string | null {
  const explRow = MOCK_CELL_EXPLANATIONS[mockCaseId]
  const curated = explRow?.[variantId]?.[evalId] ?? explRow?.[mockVKey]?.[evalId]
  if (curated) return curated
  const score = resolveExperimentCellScore(mockCaseId, variantId, mockVKey, evalId)
  if (score == null) return null
  return `Score ${formatScoreTenPoint(score)}/10 — Preview for "${evalLabel}". Detailed judge rationale will follow your rubric once this evaluator runs on the table.`
}

/** Stable mock latency / token usage per experiment cell (prototype). */
function resolveExperimentCellEvalStats(
  mockCaseId: string,
  variantId: string,
  mockVKey: string,
  evalId: string,
): { latencyLabel: string; tokensLabel: string } {
  const seed = hashStringToSeed(`${mockCaseId}:${variantId}:${mockVKey}:${evalId}:eval-stats`)
  const latencyMs = 820 + (seed % 3180)
  const latencyLabel = `${(latencyMs / 1000).toFixed(2)}s`
  const tokens = 140 + (seed % 820)
  const tokensLabel = `${tokens.toLocaleString()} tokens`
  return { latencyLabel, tokensLabel }
}

function scorePassFail(score: number, threshold: number | undefined): "pass" | "fail" | "neutral" {
  if (threshold == null) return "neutral"
  return score >= threshold ? "pass" : "fail"
}

function ScoreChip({
  score,
  threshold,
  signalRow,
}: {
  score: number | null
  threshold?: number
  /** When the experiment case is tied to an Analytics run with an open signal (yellow overview row). */
  signalRow?: boolean
}) {
  if (score === null) return null
  if (signalRow) {
    return (
      <span className="inline-flex items-center rounded border border-yellow-200 bg-yellow-50 px-1 py-0.5 text-[11px] font-semibold tabular-nums leading-none text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-300">
        {formatScoreTenPoint(score)}
      </span>
    )
  }
  const state = scorePassFail(score, threshold)
  return (
    <span
      className={cn(
        "inline-flex items-center tabular-nums rounded px-1 py-0.5 text-[11px] font-semibold leading-none",
        state === "pass" && "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
        state === "fail" && "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400",
        state === "neutral" && "bg-muted text-foreground/85 dark:bg-muted/80 dark:text-foreground/90",
      )}
    >
      {formatScoreTenPoint(score)}
    </span>
  )
}

function MatchChip({ match }: { match: boolean | null }) {
  if (match === null) return <span className="text-[11px] text-muted-foreground/40">—</span>
  return match ? (
    <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
      match
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-semibold bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400">
      no match
    </span>
  )
}

function EvalGradingRow({
  evalLabel,
  score,
  threshold,
  truncated,
  full,
  hasMore,
  latencyLabel,
  tokensLabel,
  signalRow,
}: {
  evalLabel: string
  score: number
  threshold?: number
  truncated: string
  full: string
  hasMore: boolean
  /** Evaluator wall-clock latency (e.g. \`1.24s\`). */
  latencyLabel?: string
  /** Token usage for this eval call (e.g. \`412 tokens\`). */
  tokensLabel?: string
  signalRow?: boolean
}) {
  const [expanded, setExpanded] = React.useState(false)
  const showToggle = hasMore || expanded
  const showStats = Boolean(latencyLabel && tokensLabel)
  const tokensCountDisplay =
    tokensLabel?.replace(/\s*tokens\s*$/i, "").trim() ?? ""
  return (
    <div className="px-4 py-1.5">
      <div className="flex flex-col gap-1 rounded-lg border border-border/70 bg-muted/40 p-2 dark:border-border dark:bg-muted/30">
        <div className="flex min-w-0 flex-row flex-wrap items-center gap-x-3 gap-y-1">
          <label className="flex min-w-0 w-fit max-w-full shrink-0 flex-wrap items-center gap-x-2 gap-y-0.5">
            <ScoreChip score={score} threshold={threshold} signalRow={signalRow} />
            <span className="min-w-0 text-[11px] font-medium leading-tight text-foreground">{evalLabel}</span>
          </label>
          {showStats ? (
            <span className="flex min-w-0 flex-wrap items-center gap-x-2 text-[9px] font-medium leading-tight tabular-nums text-muted-foreground">
              <span title="Latency">
                Latency: {latencyLabel}
              </span>
              <span className="text-muted-foreground/35 select-none" aria-hidden>
                ·
              </span>
              <span title="Tokens used">
                Tokens: {tokensCountDisplay || tokensLabel}
              </span>
            </span>
          ) : null}
        </div>
        <div className="flex min-w-0 items-start gap-1">
          <p
            className={cn(
              "min-w-0 flex-1 text-[12px] leading-snug text-muted-foreground",
              !expanded && "line-clamp-2",
            )}
          >
            {expanded ? full : truncated}
          </p>
          {showToggle ? (
            <button
              type="button"
              onClick={(evt) => {
                evt.stopPropagation()
                setExpanded((x) => !x)
              }}
              className="shrink-0 rounded-sm p-0.5 text-muted-foreground/60 transition-colors hover:bg-muted/60 hover:text-foreground"
              aria-label={expanded ? "Show less" : "Show more"}
            >
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-180")} />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export function defaultValuesForNode(nodeId: string): Record<string, string> {
  const node = WORKFLOW_NODES.find((n) => n.id === nodeId)
  if (!node) return {}
  const values: Record<string, string> = {}
  for (const f of node.fields) {
    if (f.type === "slider") values[f.key] = String((f.min + f.max) / 2)
    else values[f.key] = ""
  }
  return values
}

function AgentSettingsCard({
  modelField,
  values,
  onFieldChange,
}: {
  modelField: Extract<NodeField, { type: "select" }>
  values: Record<string, string>
  onFieldChange: (key: string, value: string) => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="w-fit border-b border-dashed border-gray-400 pb-0.5 text-xs font-medium text-gray-700">
        Settings
      </span>
      <div className="flex flex-col gap-1">
        <label className="text-[11px] font-medium text-gray-500" htmlFor={`agent-model-${modelField.key}`}>
          {modelField.label}
        </label>
        <select
          id={`agent-model-${modelField.key}`}
          value={values[modelField.key] ?? ""}
          onChange={(e) => onFieldChange(modelField.key, e.target.value)}
          className="w-full rounded-lg border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-200"
        >
          <option value="">Default</option>
          {modelField.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

export function VariantNodeConfigFields({
  selectedNode,
  values,
  onFieldChange,
  showSectionHeader,
  afterFirstField,
}: {
  selectedNode: WorkflowNodeDef | null
  values: Record<string, string>
  onFieldChange: (key: string, value: string) => void
  showSectionHeader?: boolean
  /** Rendered once, immediately after the first field block (e.g. contextual help in the new-variant drawer). */
  afterFirstField?: React.ReactNode
}) {
  if (!selectedNode) return null

  if (selectedNode.id === "ai-agent") {
    const systemRaw = selectedNode.fields.find((f) => f.key === "system_prompt")
    const userRaw = selectedNode.fields.find((f) => f.key === "user_prompt")
    const modelRaw = selectedNode.fields.find((f) => f.key === "model")
    const systemField = systemRaw?.type === "textarea" ? systemRaw : undefined
    const userField = userRaw?.type === "textarea" ? userRaw : undefined
    const modelField = modelRaw?.type === "select" ? modelRaw : undefined
    if (!systemField || !userField || !modelField) {
      return null
    }
    return (
      <div className="flex flex-col gap-4">
        {showSectionHeader && (
          <>
            <div className="h-px bg-gray-100" />
            <p className="text-xs text-gray-400">Configure overrides</p>
          </>
        )}
        <AgentSettingsCard modelField={modelField} values={values} onFieldChange={onFieldChange} />
        <AgentInstructionsCard
          value={values.system_prompt ?? ""}
          onChange={(v) => onFieldChange("system_prompt", v)}
          placeholder={systemField.placeholder}
        />
        {afterFirstField}
        <AgentPromptCard
          value={values.user_prompt ?? ""}
          onChange={(v) => onFieldChange("user_prompt", v)}
          placeholder={userField.placeholder}
        />
        <AgentPlaceholderSections />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {showSectionHeader && (
        <>
          <div className="h-px bg-gray-100" />
          <p className="text-xs text-gray-400">Configure overrides</p>
        </>
      )}
      {selectedNode.fields.map((field, index) => (
        <React.Fragment key={field.key}>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-gray-600">{field.label}</label>
            {field.type === "select" && (
              <select
                value={values[field.key] ?? ""}
                onChange={(e) => onFieldChange(field.key, e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-200"
              >
                <option value="">Default</option>
                {field.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            )}
            {field.type === "textarea" && (() => {
              const raw = values[field.key] ?? ""
              const inheritedRaw = field.inheritedDefault ?? ""
              const displayValue =
                raw.trim() === "" && inheritedRaw.trim() !== "" ? inheritedRaw : raw
              return (
                <textarea
                  value={displayValue}
                  onChange={(e) => onFieldChange(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  rows={6}
                  className="min-h-[140px] w-full resize-none rounded-lg border border-gray-200 bg-gray-50/50 px-3 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
                />
              )
            })()}
            {field.type === "slider" && (
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={field.min}
                  max={field.max}
                  step={field.step}
                  value={values[field.key] ?? String(field.min)}
                  onChange={(e) => onFieldChange(field.key, e.target.value)}
                  className="flex-1"
                />
                <span className="w-8 text-right text-sm text-gray-600 tabular-nums">{values[field.key] ?? field.min}</span>
              </div>
            )}
          </div>
          {index === 0 ? afterFirstField : null}
        </React.Fragment>
      ))}
    </div>
  )
}

export function WorkflowNodePicker({
  selectedId,
  onSelect,
  placeholder = "Select workflow node",
  id,
  open,
  onOpenChange,
}: {
  selectedId: string
  onSelect: (nodeId: string) => void
  /** When `selectedId` is empty, the trigger shows this placeholder (Radix: no `value`). */
  placeholder?: string
  id?: string
  /** Controlled open state (optional — omit for uncontrolled selects). */
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const controlled = open !== undefined && onOpenChange !== undefined
  return (
    <Select
      value={selectedId || undefined}
      onValueChange={onSelect}
      {...(controlled ? { open, onOpenChange } : {})}
    >
      <SelectTrigger id={id} className="h-9 w-full min-w-0 gap-2 shadow-xs">
        <span className="flex min-w-0 flex-1 items-center gap-2">
          <SelectValue className="min-w-0 truncate" placeholder={placeholder} />
        </span>
      </SelectTrigger>
      <SelectContent position="popper" align="start" className="w-[var(--radix-select-trigger-width)] min-w-[var(--radix-select-trigger-width)]">
        {WORKFLOW_NODES.map((node) => (
          <SelectItem key={node.id} value={node.id} className="pl-2" textValue={node.label}>
            <span className="flex items-center gap-2">
              <WorkflowNodeLucideIcon kind={node.iconKind} className="size-4 shrink-0 text-muted-foreground" />
              <span>{node.label}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function createNewVariantDraft(
  baselineVariant: Variant | undefined,
  nodeOverrides: Record<string, NodeConfig>,
): {
  nodeId: string
  values: Record<string, string>
} {
  const baseline = baselineVariant ?? INITIAL_VARIANTS[0]
  const cfg = getEffectiveNodeConfig(baseline, nodeOverrides)
  const nodeId = cfg.nodeId
  return {
    nodeId,
    values: { ...defaultValuesForNode(nodeId), ...(cfg.values ?? {}) },
  }
}

/** Drawer opens with no step chosen; user picks a node before overrides appear. */
function emptyNewVariantDraft(): { nodeId: string; values: Record<string, string> } {
  return { nodeId: "", values: {} }
}

/** Cell detail sheet — output block styled like structured output viewer (tabs, copy, expand). */
function CellSheetOutputPanel({ output, sourceLabel }: { output: string; sourceLabel: string }) {
  const [view, setView] = useState<"formatted" | "text">("formatted")
  const [expandOpen, setExpandOpen] = useState(false)

  const prettyPrinted = useMemo(() => {
    const t = output.trim()
    if (!t) return null
    try {
      return JSON.stringify(JSON.parse(t), null, 2)
    } catch {
      return null
    }
  }, [output])

  const formattedDisplay = prettyPrinted ?? output
  const displayContent = view === "formatted" ? formattedDisplay : output

  const copyOutput = () => {
    void navigator.clipboard.writeText(output).then(
      () => toast.success("Copied to clipboard"),
      () => toast.error("Could not copy"),
    )
  }

  return (
    <div className="flex flex-col gap-0 px-5 py-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2 text-gray-600">
          <span className="text-[11px] font-medium uppercase tracking-wide text-gray-400">Output</span>
        </div>
      </div>

      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex rounded-lg bg-gray-100/90 p-0.5">
              <button
                type="button"
                onClick={() => setView("formatted")}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                  view === "formatted"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700",
                )}
              >
                Formatted
              </button>
              <button
                type="button"
                onClick={() => setView("text")}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                  view === "text" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700",
                )}
              >
                Text
              </button>
            </div>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8 shrink-0 rounded-md border-gray-200 bg-white text-gray-600 shadow-none hover:bg-gray-50"
                onClick={() => setExpandOpen(true)}
                aria-label="Expand output"
              >
                <Maximize2 className="h-3.5 w-3.5" aria-hidden />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8 shrink-0 rounded-md border-gray-200 bg-white text-gray-600 shadow-none hover:bg-gray-50"
                onClick={copyOutput}
                aria-label="Copy output"
              >
                <Copy className="h-3.5 w-3.5" aria-hidden />
              </Button>
            </div>
      </div>

      <div className="relative mt-3 min-h-[120px] max-h-[min(42vh,300px)] resize-y overflow-y-auto rounded-lg border border-gray-200 bg-[#f5f5f6] p-3 [scrollbar-width:thin]">
        <pre className="m-0 whitespace-pre-wrap break-words font-mono text-[12px] leading-relaxed text-gray-700">
          {displayContent || "—"}
        </pre>
      </div>

      <Dialog open={expandOpen} onOpenChange={setExpandOpen}>
        <DialogContent className="flex max-h-[min(90vh,720px)] max-w-3xl flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
          <DialogHeader className="border-b border-gray-100 px-6 py-4 text-left">
            <DialogTitle className="text-base">Output</DialogTitle>
            <DialogDescription className="text-xs text-gray-500">{sourceLabel}</DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto p-6 pt-4">
            <pre className="whitespace-pre-wrap break-words rounded-lg border border-gray-200 bg-[#f5f5f6] p-4 font-mono text-[13px] leading-relaxed text-gray-800">
              {displayContent || "—"}
            </pre>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── ExperimentTab ─────────────────────────────────────────────────────────────

function ExperimentTab({
  evalDefs,
  evaluators,
  selectedEvalIds,
  setSelectedEvalIds,
  onOpenCreateEvaluator,
  onNavigateToWorkflow,
  seedCase,
  variantAppendToken = null,
  onVariantAppendConsumed,
  variantBuilderIntroToken = null,
  onVariantBuilderIntroConsumed,
}: {
  evalDefs: EvaluatorDef[]
  /** Parallel to `evalDefs` — used to show which workflow node each evaluator targets in the picker. */
  evaluators: EvaluatorConfig[]
  selectedEvalIds: string[]
  setSelectedEvalIds: React.Dispatch<React.SetStateAction<string[]>>
  onOpenCreateEvaluator: () => void
  /** After confirming "convert to draft", switch the app to the main Workflow tab (prototype). */
  onNavigateToWorkflow?: () => void
  /** When set, the experiment table starts with one row (Run progress → Evaluate / Compare / Analytics Compare). */
  seedCase?: ExperimentRunSeed | null
  /** Set when user finishes “Create variant” on Workflow; cleared after Experiment consumes it. */
  variantAppendToken?: string | null
  onVariantAppendConsumed?: () => void
  /** One-shot from layout (Run progress, Analytics, …) to open the same intro modal as “Add variant column”. */
  variantBuilderIntroToken?: string | null
  onVariantBuilderIntroConsumed?: () => void
}) {
  const tabContext = React.useContext(TabContext)
  const [variants, setVariants] = useState<Variant[]>(INITIAL_VARIANTS)
  const [cases, setCases] = useState<TestCase[]>(() =>
    seedCase
      ? [
          {
            id: `c-run-${seedCase.runId.slice(0, 8)}`,
            input: seedCase.input,
            expected: seedCase.expected,
            sourceRunId: seedCase.runId,
          },
        ]
      : INITIAL_CASES,
  )

  const [inputMode, setInputMode] = useState<"input" | "trigger">("input")

  const [hasRun, setHasRun]     = useState(false)
  const [isRunning, setIsRunning] = useState(false)

  // Sheets
  const [inputSheet, setInputSheet]     = useState<{ caseId: string; field: "input" | "expected" } | null>(null)
  const [inputDraft, setInputDraft]     = useState("")
  const [sheetRunId, setSheetRunId] = useState<string | null>(null)
  /** Side sheet: manual typing/samples vs dataset vs logged run (mutually exclusive). */
  const [inputSheetSource, setInputSheetSource] = useState<"manual" | "dataset" | "run">("manual")
  const [inputSheetDatasetId, setInputSheetDatasetId] = useState<string | null>(null)
  const [inputSheetCaseIdx, setInputSheetCaseIdx] = useState<number | null>(null)
  const [inputSheetSelectedCases, setInputSheetSelectedCases] = useState<Record<string, Set<number>>>({})
  const [nodeSheet, setNodeSheet]       = useState<{ variantId: string; variantLabel: string } | null>(null)
  /** Side sheet: first pick whether to bind a saved workflow version or edit node overrides. */
  const [nodeSheetMode, setNodeSheetMode] = useState<"workflow-version" | "node-config">("node-config")
  /** Per-variant selected workflow snapshot when mode is "workflow-version". */
  const [variantWorkflowSnapshotId, setVariantWorkflowSnapshotId] = useState<Record<string, string>>({})
  const [cellSheet, setCellSheet]       = useState<{ caseId: string; variantId: string } | null>(null)
  const [addVariantOpen, setAddVariantOpen] = useState(false)
  const [newVariantDraft, setNewVariantDraft] = useState(emptyNewVariantDraft)
  const [saveToDatasetOpen, setSaveToDatasetOpen] = useState(false)
  const [saveToDatasetRunId, setSaveToDatasetRunId] = useState<string | undefined>(undefined)

  useLayoutEffect(() => {
    if (!seedCase?.openWorkflowVariantDrawer) return
    setAddVariantOpen(true)
    setNewVariantDraft(emptyNewVariantDraft())
  }, [seedCase])

  const [addEvalMenuOpen, setAddEvalMenuOpen]         = useState(false)

  const [variantWorkflowIntroOpen, setVariantWorkflowIntroOpen] = useState(false)
  const lastVariantAppendTokenRef = React.useRef<string | null>(null)
  const lastVariantBuilderIntroTokenRef = React.useRef<string | null>(null)

  const [draftConfirmVariant, setDraftConfirmVariant] = useState<{ id: string; label: string } | null>(null)

  const [nodeConfigs, setNodeConfigs] = useState<Record<string, NodeConfig>>({})

  useEffect(() => {
    if (nodeSheet) setNodeSheetMode("node-config")
  }, [nodeSheet])

  useEffect(() => {
    if (!inputSheet) return
    setInputSheetDatasetId("")
    setInputSheetCaseIdx(null)
  }, [inputSheet])

  useEffect(() => {
    if (!variantAppendToken) return
    if (variantAppendToken === lastVariantAppendTokenRef.current) {
      queueMicrotask(() => onVariantAppendConsumed?.())
      return
    }
    lastVariantAppendTokenRef.current = variantAppendToken
    setVariants((prev) => {
      const baseline = prev.find((v) => v.id === BASELINE_VARIANT_ID) ?? prev[0]
      if (!baseline) return prev
      const nextLen = prev.length + 1
      const label = nextLen === 2 ? "Variant Output" : `Variant ${nextLen}`
      const id =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? `v-${crypto.randomUUID()}`
          : `v-${Date.now()}-${Math.random().toString(16).slice(2)}`
      return [
        ...prev,
        {
          id,
          label,
          workflow: {
            nodeId: baseline.workflow.nodeId,
            values: { ...baseline.workflow.values },
          },
        },
      ]
    })
    queueMicrotask(() => onVariantAppendConsumed?.())
  }, [variantAppendToken, onVariantAppendConsumed])

  useEffect(() => {
    if (!variantBuilderIntroToken) return
    if (variantBuilderIntroToken === lastVariantBuilderIntroTokenRef.current) {
      queueMicrotask(() => onVariantBuilderIntroConsumed?.())
      return
    }
    lastVariantBuilderIntroTokenRef.current = variantBuilderIntroToken
    setVariantWorkflowIntroOpen(true)
    queueMicrotask(() => onVariantBuilderIntroConsumed?.())
  }, [variantBuilderIntroToken, onVariantBuilderIntroConsumed])

  const selectedEvalSummary = useMemo(() => {
    const labels = selectedEvalIds
      .map((id) => evalDefs.find((e) => e.id === id)?.label)
      .filter(Boolean) as string[]
    if (labels.length === 0) return null
    if (labels.length > 1) return `${labels.length} Evals Selected`
    return labels[0]
  }, [selectedEvalIds, evalDefs])

  const singleSelectedEvalLabel = useMemo(() => {
    if (selectedEvalIds.length !== 1) return null
    return evalDefs.find((e) => e.id === selectedEvalIds[0])?.label ?? null
  }, [selectedEvalIds, evalDefs])

  const singleSelectedEvaluationType = useMemo(() => {
    if (selectedEvalIds.length !== 1) return null
    return evalDefs.find((e) => e.id === selectedEvalIds[0])?.evaluationType ?? null
  }, [selectedEvalIds, evalDefs])

  /** Second column: expected ground truth when any selected evaluator compares to expected output. */
  const showExpectedOutputColumn = useMemo(
    () =>
      selectedEvalIds.some((id) => {
        const t = evalDefs.find((e) => e.id === id)?.evaluationType?.toLowerCase() ?? ""
        return t.includes("expected output")
      }),
    [selectedEvalIds, evalDefs],
  )

  const baselineVariant = useMemo(
    () => variants.find((x) => x.id === BASELINE_VARIANT_ID) ?? INITIAL_VARIANTS[0],
    [variants],
  )

  const toggleEvalInTable = (id: string, checked: boolean) => {
    setSelectedEvalIds((prev) => {
      if (checked) return prev.includes(id) ? prev : [...prev, id]
      return prev.filter((x) => x !== id)
    })
  }

  const removeVariant = (id: string) => {
    if (id === BASELINE_VARIANT_ID) return
    setVariants((prev) => prev.filter((v) => v.id !== id))
  }

  const appendVariantColumn = useCallback(() => {
    setVariants((prev) => {
      const baseline = prev.find((v) => v.id === BASELINE_VARIANT_ID) ?? prev[0]
      if (!baseline) return prev
      const nextLen = prev.length + 1
      const label = nextLen === 2 ? "Variant Output" : `Variant ${nextLen}`
      const id =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? `v-${crypto.randomUUID()}`
          : `v-${Date.now()}-${Math.random().toString(16).slice(2)}`
      return [
        ...prev,
        {
          id,
          label,
          workflow: {
            nodeId: baseline.workflow.nodeId,
            values: { ...baseline.workflow.values },
          },
        },
      ]
    })
  }, [])

  const handleAddVariantColumnClick = useCallback(() => {
    appendVariantColumn()
    window.setTimeout(() => {
      setVariantWorkflowIntroOpen(true)
    }, 420)
  }, [appendVariantColumn])

  const setVariantColumnOutput = useCallback((variantId: string, columnOutput: ExperimentColumnOutput) => {
    setVariants((prev) => prev.map((v) => (v.id === variantId ? { ...v, columnOutput } : v)))
  }, [])

  const commitNewVariant = () => {
    if (!newVariantDraft.nodeId) return
    const n = variants.length + 1
    const label = n === 2 ? "Variant Output" : `Variant ${n}`
    setVariants((prev) => [
      ...prev,
      {
        id: typeof crypto !== "undefined" && crypto.randomUUID ? `v-${crypto.randomUUID()}` : `v-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        label,
        workflow: {
          nodeId: newVariantDraft.nodeId,
          values: { ...newVariantDraft.values },
        },
      },
    ])
    setAddVariantOpen(false)
    setNewVariantDraft(emptyNewVariantDraft())
  }

  const selectDraftNode = (nodeId: string) => {
    setNewVariantDraft((prev) => {
      if (prev.nodeId === nodeId) return prev
      const baseline = variants.find((v) => v.id === BASELINE_VARIANT_ID) ?? INITIAL_VARIANTS[0]
      const baselineCfg = getEffectiveNodeConfig(baseline, nodeConfigs)
      const values =
        baselineCfg.nodeId === nodeId
          ? { ...defaultValuesForNode(nodeId), ...(baselineCfg.values ?? {}) }
          : defaultValuesForNode(nodeId)
      return { nodeId, values }
    })
  }

  const setDraftField = (key: string, value: string) => {
    setNewVariantDraft((prev) => ({
      ...prev,
      values: { ...prev.values, [key]: value },
    }))
  }

  const addCase = () => {
    const id = `c-${Date.now()}`
    setCases((prev) => [...prev, { id, input: "", expected: "" }])
    setInputDraft("")
    setSheetRunId(null)
    setInputSheetSource("manual")
    setInputSheet({ caseId: id, field: "input" })
  }
  const removeCase = (id: string) => setCases(prev => prev.filter(c => c.id !== id))

  /** Single grid template so header, body, and footer columns share exact tracks (fixes flex row misalignment). Leading column: row actions. */
  const experimentTableGridTemplate = useMemo(
    () =>
      `max-content ${showExpectedOutputColumn ? "minmax(120px, 1fr) minmax(96px, 1fr)" : "minmax(120px, 1fr)"} ${variants.map(() => "minmax(17rem, 1fr)").join(" ")}`,
    [variants.length, showExpectedOutputColumn],
  )

  const runEvaluatorDisabled = isRunning || selectedEvalIds.length === 0
  const runEvaluatorDisabledReason = isRunning
    ? "A run is already in progress. Wait for it to finish before starting another."
    : "Select at least one evaluator from the dropdown before running."

  const handleRunEvaluator = useCallback(() => {
    setIsRunning(true)
    setHasRun(false)
    const evalLabels = evalDefs
      .filter((ev) => selectedEvalIds.includes(ev.id))
      .map((ev) => ev.label)
    const inputPieces = cases.map((c) => c.input.trim()).filter(Boolean)
    const inputSummary = inputPieces.join(" · ").slice(0, 280) || "(empty matrix input)"
    const variantCount = variants.length
    setTimeout(() => {
      setIsRunning(false)
      setHasRun(true)
      const row: RunData = {
        runId: crypto.randomUUID(),
        conversationId: "N/A",
        created: formatAnalyticsRunTimestamp(),
        origin: "Experiment",
        version: "v8",
        status: "success",
        input: inputSummary,
        output: JSON.stringify({
          experiment: "evaluator_matrix",
          variants: variantCount,
          evaluators: evalLabels,
        }),
        latency: `${(1.15 + Math.random() * 1.25).toFixed(2)}s`,
        tokens: Math.round(60 + Math.random() * 380),
        user: "—",
      }
      tabContext?.appendAnalyticsRun(row)
    }, 1800)
  }, [evalDefs, selectedEvalIds, cases, variants, tabContext])

  const evaluatorSelectMenuContent = useMemo(
    () => (
      <>
        {evalDefs.map((ev, index) => {
          const cfg = evaluators[index]
          const evaluatedNode =
            cfg != null ? evaluatedSelectLabelFromOutput(cfg.output) : "—"
          return (
            <DropdownMenuCheckboxItem
              key={ev.id}
              indicatorPosition="end"
              multiline
              checked={selectedEvalIds.includes(ev.id)}
              onCheckedChange={(checked) => toggleEvalInTable(ev.id, checked)}
              onSelect={(e) => e.preventDefault()}
            >
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="font-medium leading-tight">{ev.label}</span>
                <span className="inline-flex min-w-0 flex-wrap items-center gap-x-1 text-xs font-normal text-muted-foreground leading-tight">
                  <span>{ev.evaluationType}</span>
                  <span className="text-muted-foreground/45"> · </span>
                  <span className="min-w-0">{evaluatedNode}</span>
                </span>
              </span>
            </DropdownMenuCheckboxItem>
          )
        })}
        {evalDefs.length > 0 ? <DropdownMenuSeparator /> : null}
        <DropdownMenuItem
          className="gap-2"
          onSelect={() => {
            onOpenCreateEvaluator()
            setAddEvalMenuOpen(false)
          }}
        >
          <Plus className="h-3.5 w-3.5 opacity-70" />
          Create new eval
        </DropdownMenuItem>
      </>
    ),
    [evalDefs, evaluators, selectedEvalIds, toggleEvalInTable, onOpenCreateEvaluator],
  )

  return (
    <div className="flex min-h-0 min-w-0 flex-col p-6 gap-4">

      <Dialog open={variantWorkflowIntroOpen} onOpenChange={setVariantWorkflowIntroOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create a variant from workflow draft</DialogTitle>
            <DialogDescription asChild>
              <Alert className="border-violet-200 bg-violet-50/90 text-left text-violet-950 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-50 sm:text-left">
                <Info className="h-4 w-4 text-violet-600 dark:text-violet-300" aria-hidden />
                <AlertDescription className="text-pretty text-violet-900/90 dark:text-violet-100/90">
                  You&apos;ll open the Workflow tab to change prompts and settings. When you&apos;re done, click on save variant.
                </AlertDescription>
              </Alert>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setVariantWorkflowIntroOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-foreground text-background hover:bg-foreground/90"
              onClick={() => {
                tabContext?.startWorkflowVariantEditFromExperiment()
                setVariantWorkflowIntroOpen(false)
              }}
            >
              Continue to Workflow
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Top bar ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4">
        <ManusTipBanner>
          <p>
            <span className="font-medium text-foreground">Experiments</span> let you evaluate test cases (rows) and score
            it with evaluators. You can also compare workflow variations by swapping prompts/models (columns).
          </p>
        </ManusTipBanner>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TooltipProvider delayDuration={300}>
            <div className="flex flex-wrap items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1.5 rounded-md px-3 text-xs font-medium text-foreground shadow-none bg-white hover:bg-gray-50"
                    onClick={addCase}
                  >
                    <Plus className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                    Add input row
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" align="start" className="max-w-xs text-xs">
                  Add another input row to the matrix with its own input (and expected output when that column is on).
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1.5 rounded-md px-3 text-xs font-medium text-foreground shadow-none bg-white hover:bg-gray-50"
                    onClick={handleAddVariantColumnClick}
                  >
                    <Plus className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                    Add variant column
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" align="start" className="max-w-xs text-xs">
                  Opens a short setup, then the Workflow tab so you can edit the graph and save it as a new experiment column with Create variant.
                </TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>

          <div className="flex flex-wrap items-center justify-end gap-2">
            {/* Evaluator selector — empty state shows placeholder until at least one eval is checked */}
            <DropdownMenu open={addEvalMenuOpen} onOpenChange={setAddEvalMenuOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 h-8 min-w-[10rem] max-w-[280px] justify-between font-normal">
                  <span
                    className={cn(
                      "flex min-w-0 flex-1 items-center gap-2 truncate text-left font-medium",
                      selectedEvalSummary ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {singleSelectedEvalLabel ? (
                      <>
                        {singleSelectedEvaluationType ? (
                          <span
                            title={singleSelectedEvaluationType}
                            className="max-w-[min(11rem,40vw)] shrink-0 truncate rounded border border-border bg-muted/60 px-1.5 py-px text-left text-[10px] font-semibold leading-tight tracking-wide text-muted-foreground normal-case"
                          >
                            {singleSelectedEvaluationType}
                          </span>
                        ) : null}
                        <span className="min-w-0 truncate">{singleSelectedEvalLabel}</span>
                      </>
                    ) : (
                      <span className="truncate">{selectedEvalSummary ?? "Select evals"}</span>
                    )}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-56 w-64">
                {evaluatorSelectMenuContent}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Run — when disabled, span trigger so hover shows why (disabled buttons don’t receive pointer events) */}
            {runEvaluatorDisabled ? (
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex shrink-0 rounded-md">
                      <Button
                        size="sm"
                        className="h-8 w-[133px] shrink-0 justify-center gap-1.5 bg-foreground text-background hover:bg-foreground/90 disabled:opacity-60"
                        disabled
                        onClick={handleRunEvaluator}
                      >
                        <Play className={cn("w-3.5 h-3.5", isRunning && "animate-spin")} />
                        {isRunning ? "running…" : selectedEvalIds.length > 1 ? "Run Evaluators" : "Run Evaluator"}
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" align="end" className="max-w-xs text-xs text-balance">
                    {runEvaluatorDisabledReason}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <Button
                size="sm"
                className="h-8 w-[133px] shrink-0 justify-center gap-1.5 bg-foreground text-background hover:bg-foreground/90 disabled:opacity-60"
                onClick={handleRunEvaluator}
              >
                <Play className={cn("w-3.5 h-3.5", isRunning && "animate-spin")} />
                {selectedEvalIds.length > 1 ? "Run Evaluators" : "Run Evaluator"}
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="shrink-0 border-0 bg-transparent shadow-none hover:!bg-transparent dark:hover:!bg-transparent hover:text-foreground"
                  aria-label="Experiment table actions"
                >
                  <MoreHorizontal className="h-4 w-4" aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                sideOffset={6}
                className="w-52 rounded-lg border border-gray-200 bg-white p-1 text-foreground shadow-md"
              >
                <DropdownMenuItem
                  className="gap-2 py-2 text-sm"
                  onSelect={() => toast.message("Chat with Table")}
                >
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  Chat with Table
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="gap-2 py-2 text-sm"
                  onSelect={() => toast.message("Download CSV")}
                >
                  <CloudDownload className="h-4 w-4 text-muted-foreground" />
                  Download CSV
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="gap-2 py-2 text-sm"
                  onSelect={() => toast.message("Download PDF")}
                >
                  <CloudDownload className="h-4 w-4 text-muted-foreground" />
                  Download PDF
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="gap-2 py-2 text-sm"
                  onSelect={() => toast.message("Import CSV")}
                >
                  <CloudUpload className="h-4 w-4 text-muted-foreground" />
                  Import CSV
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  className="gap-2 py-2 text-sm"
                  onSelect={() => toast.message("Delete all runs")}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete all runs
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="gap-2 py-2 text-sm"
                  onSelect={() => toast.message("Resume runs")}
                >
                  <Play className="h-4 w-4 text-muted-foreground" />
                  Resume runs
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* ── Main table: card height follows content; page tab area scrolls if needed ── */}
      <div className="relative w-full max-w-full shrink-0 overflow-hidden rounded-lg border border-border/80 bg-background shadow-[0_1px_1px_rgba(0,0,0,0.035)]">
        <div className="w-full min-w-0">
          <div
            className="grid w-full min-w-0"
            style={{ gridTemplateColumns: experimentTableGridTemplate }}
          >
            {/* ── Column header row (Vercel-style labels, same as Evaluators table) ── */}
            <div className="flex min-w-0 items-center justify-center self-stretch border-b border-border/70 bg-muted/30 border-r border-border/60 px-2.5 py-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Actions</span>
            </div>
            <div className="min-w-0 flex items-center px-4 py-2.5 border-b border-border/70 bg-muted/30 border-r border-border/60">
              <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                Input
              </span>
            </div>
            {showExpectedOutputColumn ? (
              <div className="min-w-0 flex items-center px-4 py-2.5 border-b border-border/70 bg-muted/30 border-r border-border/60">
                <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Expected output</span>
              </div>
            ) : null}
            {variants.map((v) => {
              const summary = getVariantHeaderSummary(v, nodeConfigs)
              const cfg = getEffectiveNodeConfig(v, nodeConfigs)
              const node = cfg.nodeId ? WORKFLOW_NODES.find((n) => n.id === cfg.nodeId) : null
              const columnOutput = v.columnOutput ?? DEFAULT_EXPERIMENT_COLUMN_OUTPUT
              const workflowOutputLabel = getExperimentColumnOutputLabel(columnOutput)
              const variantDiffLines =
                v.id === BASELINE_VARIANT_ID
                  ? null
                  : getVariantDiffTooltipLines(baselineVariant, v, nodeConfigs, variantWorkflowSnapshotId)
              const variantChipIndex = variants
                .filter((vv) => vv.id !== BASELINE_VARIANT_ID)
                .findIndex((vv) => vv.id === v.id)
              const variantChipLabel =
                variantChipIndex <= 0 ? "Variant" : `Variant ${variantChipIndex + 1}`
              return (
                <div
                  key={`h-${v.id}`}
                  className="relative flex min-h-0 min-w-0 flex-col justify-center border-b border-border/70 bg-muted/30 border-r border-border/60 transition-colors"
                >
                  <div className="flex w-full flex-col gap-1 px-4 py-2.5">
                    <div className="flex min-h-[1.75rem] w-full min-w-0 items-center gap-2">
                      {v.id === BASELINE_VARIANT_ID ? (
                        <span className="shrink-0 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                          Output
                        </span>
                      ) : (
                        <TooltipProvider delayDuration={300}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-flex shrink-0 cursor-help items-center rounded-md border border-violet-200 bg-violet-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-800 shadow-sm dark:border-violet-700 dark:bg-violet-950/60 dark:text-violet-100">
                                {variantChipLabel}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent
                              side="top"
                              align="start"
                              className="max-w-[min(320px,88vw)] space-y-1.5 text-left text-xs font-normal normal-case tracking-normal"
                            >
                              <p className="font-medium text-foreground">Changes vs baseline</p>
                              <ul className="list-disc space-y-0.5 pl-3.5 text-muted-foreground">
                                {variantDiffLines!.map((line, i) => (
                                  <li key={i}>{line}</li>
                                ))}
                              </ul>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      <Select
                        value={columnOutput}
                        onValueChange={(val) => setVariantColumnOutput(v.id, val as ExperimentColumnOutput)}
                      >
                        <SelectTrigger
                          size="sm"
                          parenWrapped
                          className="h-7 w-fit min-w-0 justify-start gap-0 border-0 bg-transparent px-0 py-0 text-[11px] font-medium uppercase tracking-wide text-muted-foreground shadow-none hover:bg-transparent hover:text-foreground focus-visible:ring-1 focus-visible:ring-border dark:bg-transparent dark:hover:bg-transparent sm:max-w-[14rem] [&_svg]:size-3 [&_svg]:opacity-60"
                          aria-label="Workflow output"
                        >
                          <SelectValue placeholder="Node output">{workflowOutputLabel}</SelectValue>
                        </SelectTrigger>
                        <SelectContent
                          position="popper"
                          align="start"
                          className="min-w-[14rem]"
                          startAtTop
                        >
                          {GANTT_NODES.map((node) => (
                            <SelectItem key={node.id} value={node.id} textValue={node.label}>
                              <span className="flex items-center gap-2">
                                <GanttNodeIcon type={node.icon} />
                                <span>{node.label}</span>
                              </span>
                            </SelectItem>
                          ))}
                          {(() => {
                            const extraWorkflowOutputs = WORKFLOW_NODES.filter(
                              (n) => !WORKFLOW_NODE_IDS_HIDDEN_IN_EXPERIMENT_COLUMN_OUTPUT.has(n.id),
                            )
                            if (extraWorkflowOutputs.length === 0) return null
                            return (
                              <>
                                <SelectSeparator />
                                {extraWorkflowOutputs.map((n) => (
                                  <SelectItem key={n.id} value={n.id} textValue={n.label}>
                                    <span className="flex items-center gap-2">
                                      <WorkflowNodeLucideIcon kind={n.iconKind} />
                                      {n.label}
                                    </span>
                                  </SelectItem>
                                ))}
                              </>
                            )
                          })()}
                        </SelectContent>
                      </Select>
                      {v.id !== BASELINE_VARIANT_ID && (
                        <div className="flex shrink-0 items-center gap-0.5">
                          <TooltipProvider delayDuration={300}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  onClick={() => tabContext?.startWorkflowVariantEditFromExperiment()}
                                  className={cn("shrink-0 rounded px-1.5 py-0.5 text-[10px] transition-colors",
                                    node ? "text-gray-500 hover:text-gray-700" : "text-gray-300 hover:text-gray-500"
                                  )}
                                  aria-label="Edit variant in Workflow"
                                >
                                  <Settings2 className="w-3 h-3" aria-hidden />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-[14rem] text-xs">
                                Open the Workflow tab in variant mode to edit the graph for this column. Use Create variant when done, or Cancel to return without changes.
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <button
                            type="button"
                            onClick={() => removeVariant(v.id)}
                            className="shrink-0 text-gray-300 transition-colors hover:text-red-600"
                            aria-label="Remove variant"
                          >
                            <X className="w-3.5 h-3.5" aria-hidden />
                          </button>
                        </div>
                      )}
                    </div>
                    {summary.node?.id === "ai-agent" ? (
                      v.pinnedNodeIds && v.pinnedNodeIds.length > 0 ? (
                        <p className="text-[10px] text-muted-foreground/90 leading-snug line-clamp-2" title={v.pinnedNodeIds.map((id) => PINNABLE_NODES.find((p) => p.id === id)?.label ?? id).join(", ")}>
                          Pinned:{" "}
                          {v.pinnedNodeIds
                            .map((id) => PINNABLE_NODES.find((p) => p.id === id)?.label ?? id)
                            .join(", ")}
                        </p>
                      ) : null
                    ) : summary.node && summary.modelLabel ? (
                      <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground leading-snug line-clamp-2" title={summary.modelLabel}>
                        <span className="mt-0.5 shrink-0">
                          <WorkflowNodeLucideIcon kind={summary.node.iconKind} />
                        </span>
                        <span>
                          {summary.node.label}
                          {" · "}
                          {summary.modelLabel}
                        </span>
                      </p>
                    ) : null}
                  </div>
                </div>
              )
            })}

            {/* ── Test case rows (subgrid row: same column tracks + reliable row hover) ── */}
            {cases.map((tc) => (
              <div
                key={tc.id}
                className="group col-span-full grid grid-cols-subgrid border-b border-border/70 transition-colors hover:bg-muted/40"
                style={{ gridColumn: "1 / -1" }}
              >
                <div
                  className={cn(
                    "flex min-w-0 items-center justify-center gap-0.5 self-stretch border-r border-border/60 px-2.5",
                    !hasRun && "bg-muted/20"
                  )}
                >
                  <TooltipProvider delayDuration={300}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                          aria-label="Rerun"
                          onClick={() => toast.message("Rerun", { description: "Not wired in this prototype." })}
                        >
                          <Play className="h-3.5 w-3.5" aria-hidden />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        Rerun
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                          aria-label="Save run to dataset"
                          onClick={() => {
                            setSaveToDatasetRunId(tc.sourceRunId ?? tc.id)
                            setSaveToDatasetOpen(true)
                          }}
                        >
                          <Database className="h-3.5 w-3.5" aria-hidden />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        Save run to dataset
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          disabled={cases.length <= 1}
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:pointer-events-none disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
                          aria-label="Delete row"
                          onClick={() => removeCase(tc.id)}
                        >
                          <X className="h-3.5 w-3.5" aria-hidden />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        Delete
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="min-w-0 flex items-center px-4 py-4 border-r border-border/60">
                  <button type="button"
                    onClick={() => {
                      setInputDraft(tc.input)
                      setSheetRunId(null)
                      setInputSheetSource("manual")
                      setInputSheet({ caseId: tc.id, field: "input" })
                    }}
                    className={cn(
                      "w-full min-w-0 py-0.5 px-0 text-left transition-colors cursor-pointer rounded-sm",
                      inputMode === "trigger" && tc.input
                        ? "font-mono text-[11px] leading-relaxed text-foreground hover:bg-muted/30"
                        : "text-[13px] leading-snug truncate",
                      !(inputMode === "trigger" && tc.input) &&
                        (tc.input ? "text-foreground hover:bg-muted/30" : "text-muted-foreground hover:bg-muted/20"),
                    )}>
                    {tc.input ? (
                      inputMode === "trigger" ? (
                        <span className="line-clamp-4 w-full min-w-0 whitespace-pre-wrap break-all text-left">
                          {experimentTriggerPayloadForDisplay(tc.input)}
                        </span>
                      ) : (
                        <span className="truncate">{tc.input}</span>
                      )
                    ) : (
                      <span className="text-[13px] opacity-50">
                        {inputMode === "input" ? "Click to add input" : "add workflow trigger…"}
                      </span>
                    )}
                  </button>
                </div>
                {showExpectedOutputColumn ? (
                  <div className="min-w-0 flex items-center px-4 py-4 border-r border-border/60 bg-background">
                    <button
                      type="button"
                      onClick={() => {
                        setInputDraft(tc.expected)
                        setInputSheet({ caseId: tc.id, field: "expected" })
                      }}
                      className={cn(
                        "w-full min-w-0 text-left text-[13px] leading-snug truncate py-0.5 px-0 transition-colors cursor-pointer rounded-sm",
                        tc.expected ? "text-foreground hover:bg-muted/30" : "text-muted-foreground hover:bg-muted/20",
                      )}
                    >
                      {tc.expected || <span className="opacity-50">add expected output…</span>}
                    </button>
                  </div>
                ) : null}
                {variants.map((v, vIdx) => {
                  const mockVKey = resolveExperimentMockVariantKey(v.id, vIdx)
                  const mockCaseId = experimentMockBackingCaseId(tc.id)
                  const output = hasRun ? (getExperimentMockOutput(tc.id, v, mockVKey) ?? null) : null
                  const activeEvalDefs = evalDefs.filter(
                    (ev) => ev.type !== "reference" && selectedEvalIds.includes(ev.id),
                  )
                  return (
                    <div
                      key={`${tc.id}-${v.id}`}
                      className={cn(
                        "relative flex min-h-0 min-w-0 flex-col border-r border-border/60",
                        !hasRun && "bg-muted/20",
                        hasRun && output && "cursor-pointer",
                      )}
                      onClick={() => {
                        if (hasRun && output) setCellSheet({ caseId: tc.id, variantId: v.id })
                      }}
                    >
                      {/* Output (full width, wraps) — pt/pb aligned with Input column (py-4) */}
                      <div className="w-full min-w-0 shrink-0 px-4 pt-4 pb-2">
                        {isRunning ? (
                          <span className="text-[13px] text-muted-foreground/50 animate-pulse">…</span>
                        ) : output ? (
                          <div className="flex min-h-0 w-full min-w-0 items-start text-left transition-colors hover:text-foreground">
                            <span className="line-clamp-3 w-full min-w-0 break-words font-mono text-[12px] leading-5 text-muted-foreground">
                              {output}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[13px] text-muted-foreground/40">—</span>
                        )}
                      </div>

                      {/* Evaluator gradings */}
                      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-1.5 pb-4">
                        {isRunning ? (
                          <div className="px-4 py-3">
                            <span className="text-[13px] text-muted-foreground/50 animate-pulse">Evaluating…</span>
                          </div>
                        ) : !hasRun ? (
                          <div className="px-4 py-3">
                            <span className="text-[13px] text-muted-foreground/30">—</span>
                          </div>
                        ) : (
                          activeEvalDefs.map((ev) => {
                            const score = resolveExperimentCellScore(mockCaseId, v.id, mockVKey, ev.id)
                            const explanation = resolveExperimentCellExplanation(
                              mockCaseId,
                              v.id,
                              mockVKey,
                              ev.id,
                              ev.label,
                            )
                            if (score === null) return null
                            // truncate to 2 sentences
                            const sentences = explanation ? explanation.split(/(?<=[.!?])\s+/) : []
                            const truncated = sentences.slice(0, 2).join(" ")
                            const hasMore = sentences.length > 2
                            const { latencyLabel, tokensLabel } = resolveExperimentCellEvalStats(
                              mockCaseId,
                              v.id,
                              mockVKey,
                              ev.id,
                            )
                            return (
                              <EvalGradingRow
                                key={ev.id}
                                evalLabel={ev.label}
                                score={score}
                                threshold={ev.passThreshold}
                                truncated={truncated}
                                full={explanation ?? ""}
                                hasMore={hasMore}
                                latencyLabel={latencyLabel}
                                tokensLabel={tokensLabel}
                                signalRow={experimentCaseLinkedToAnalyticsSignal(tc)}
                              />
                            )
                          })
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
            {hasRun ? (
              <div
                className="col-span-full grid grid-cols-subgrid sticky bottom-0 z-30 border-t border-border/80 bg-muted/30 py-0"
                style={{ gridColumn: "1 / -1" }}
              >
                <div className="flex min-w-0 items-center self-stretch border-r border-border/60 px-2.5 py-3" aria-hidden />
                <div className="flex min-w-0 items-center border-r border-border/60 px-4 py-3" aria-hidden />
                {showExpectedOutputColumn ? (
                  <div className="min-w-0 border-r border-border/60 px-4 py-3" aria-hidden />
                ) : null}
                {variants.map((v) => (
                  <div
                    key={`draft-bar-${v.id}`}
                    className="flex min-w-0 items-center justify-center border-r border-border/60 px-2 py-3"
                  >
                    {v.id === BASELINE_VARIANT_ID ? (
                      <span className="text-xs text-muted-foreground/50" aria-hidden>
                        —
                      </span>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 w-auto max-w-none shrink-0 whitespace-nowrap px-3 font-normal"
                        onClick={() =>
                          setDraftConfirmVariant({
                            id: v.id,
                            label: v.label,
                          })
                        }
                      >
                        Apply changes to workflow draft
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <Dialog
        open={draftConfirmVariant != null}
        onOpenChange={(open) => {
          if (!open) setDraftConfirmVariant(null)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Apply changes to workflow draft?</DialogTitle>
            <DialogDescription>
              Saves the node overrides from{" "}
              <span className="font-medium text-foreground">
                {draftConfirmVariant?.label ?? "this variant"}
              </span>
              {" "}as a workflow draft. The draft is not published. You can review and publish it from the Workflow tab.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setDraftConfirmVariant(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="gap-1.5 bg-foreground text-background hover:bg-foreground/90"
              onClick={() => {
                const label = draftConfirmVariant?.label ?? ""
                const variantId = draftConfirmVariant?.id
                setDraftConfirmVariant(null)
                toast.success("Draft saved", {
                  description: variantId != null
                    ? label + " saved as a workflow draft. Open the Workflow tab to review and publish."
                    : "Saved as a workflow draft. Open the Workflow tab to review and publish.",
                })
                onNavigateToWorkflow?.()
              }}
            >
              Save as draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Input / Expected side sheet ──────────────────────────────── */}
      {inputSheet && (() => {
        const tc = cases.find(c => c.id === inputSheet.caseId)!
        const isExpected = inputSheet.field === "expected"
        const isTrigger  = !isExpected && inputMode === "trigger"
        const activeLoggedRun = sheetRunId ? MOCK_LOGGED_RUNS.find(r => r.id === sheetRunId) ?? null : null

        const TRIGGER_PAYLOADS = EXPERIMENT_TRIGGER_PAYLOAD_SAMPLES
        const selectedTriggerPayload = TRIGGER_PAYLOADS.find(
          (p) => p.payload === tc.input || p.label === tc.input,
        )

        const closeDatasetSheet = () => {
          setInputSheet(null)
          setSheetRunId(null)
          setInputSheetSource("manual")
        }

        const applyDatasetRowToCurrentCase = (row: DatasetRow) => {
          setCases((prev) =>
            prev.map((c) => (c.id === inputSheet.caseId ? { ...c, input: row.input, expected: row.expected } : c)),
          )
          closeDatasetSheet()
        }

        const selectedDataset = inputSheetDatasetId
          ? MOCK_DATASETS.find((d) => d.id === inputSheetDatasetId) ?? null
          : null

        const selectedCasesForDataset = inputSheetDatasetId ? (inputSheetSelectedCases[inputSheetDatasetId] ?? new Set<number>()) : new Set<number>()
        const totalSelectedCases = selectedCasesForDataset.size

        const toggleDatasetCase = (dsId: string, rowIdx: number) => {
          setInputSheetSelectedCases((prev) => {
            const existing = new Set(prev[dsId] ?? [])
            if (existing.has(rowIdx)) existing.delete(rowIdx)
            else existing.add(rowIdx)
            return { ...prev, [dsId]: existing }
          })
        }

        const addCaseFromDataset = (ds: Dataset, rowIdx: number) => {
          const row = ds.rows[rowIdx]
          if (!row) return
          setCases((prev) => [...prev, {
            id: `c-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            input: row.input,
            expected: row.expected,
          }])
        }

        const addAllCasesFromDataset = (ds: Dataset) => {
          const newCases: TestCase[] = ds.rows.map((row) => ({
            id: `c-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            input: row.input,
            expected: row.expected,
          }))
          setCases((prev) => [...prev, ...newCases])
        }

        const datasetPanelJsx = (
          <div className="mt-1 flex flex-col gap-3">
            <p className="min-w-0 text-xs leading-relaxed text-gray-500">
              {isTrigger
                ? "Each row replaces this case's trigger payload (and expected if present)."
                : "Each row replaces this case's workflow input (and expected if present)."}
            </p>

            {/* Dataset select */}
            <div className="flex flex-col gap-1.5">
              <p className="text-xs font-medium text-gray-600">Dataset</p>
              <Select
                value={inputSheetDatasetId ?? ""}
                onValueChange={(val) => {
                  setInputSheetDatasetId(val || null)
                  setInputSheetCaseIdx(null)
                }}
              >
                <SelectTrigger className="h-9 w-full rounded-lg border-gray-200 bg-white text-sm text-gray-900 focus:ring-2 focus:ring-gray-300">
                  <SelectValue placeholder="Select a dataset…" />
                </SelectTrigger>
                <SelectContent className="z-[200]">
                  {MOCK_DATASETS.map((ds) => (
                    <SelectItem key={ds.id} value={ds.id}>
                      <span className="flex items-center gap-2">
                        <Database className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                        <span>{ds.name}</span>
                        <span className="text-xs text-gray-400">{ds.rows.length} cases</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Case picker — only when dataset selected */}
            {selectedDataset && (() => {
              const ds = selectedDataset
              return (
                <div className="flex flex-col gap-1.5">
                  <p className="text-xs font-medium text-gray-600">Case</p>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 text-left text-sm text-gray-900 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300"
                      >
                        <span className={cn("truncate", inputSheetCaseIdx === null ? "text-gray-400" : "text-gray-900")}>
                          {inputSheetCaseIdx === null
                            ? "Select a case…"
                            : `Case ${inputSheetCaseIdx + 1} — ${ds.rows[inputSheetCaseIdx]?.input.slice(0, 40)}…`}
                        </span>
                        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="z-[200] w-[var(--radix-popover-trigger-width)] p-0" sideOffset={4}>
                      {/* Add all */}
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 border-b border-gray-100 px-3 py-2.5 text-left text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                        onClick={() => {
                          addAllCasesFromDataset(ds)
                          toast.success(`Added all ${ds.rows.length} cases`)
                        }}
                      >
                        <Plus className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                        Add all {ds.rows.length} cases
                      </button>
                      {/* Individual cases */}
                      <div className="max-h-52 overflow-y-auto py-1">
                        {ds.rows.map((row, ri) => (
                          <button
                            key={ri}
                            type="button"
                            className={cn(
                              "flex w-full items-start gap-2 px-3 py-2 text-left transition-colors hover:bg-gray-50",
                              inputSheetCaseIdx === ri ? "bg-gray-50" : ""
                            )}
                            onClick={() => {
                              setInputSheetCaseIdx(ri)
                              addCaseFromDataset(ds, ri)
                              toast.success(`Case ${ri + 1} added`)
                            }}
                          >
                            <span className="mt-0.5 shrink-0 rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] text-gray-500">{ri + 1}</span>
                            <span className="min-w-0 flex-1">
                              <span className="line-clamp-2 text-xs leading-snug text-gray-700">{row.input}</span>
                              {row.expected && (
                                <span className="mt-0.5 block truncate font-mono text-[10px] text-gray-400">{row.expected.slice(0, 60)}</span>
                              )}
                            </span>
                          </button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              )
            })()}
          </div>
        )

        const runPanelJsx = (
          <div className="mt-1 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <p className="min-w-0 text-xs leading-relaxed text-gray-500">
                {isTrigger
                  ? "Use the payload stored on a logged run for this case."
                  : "Use the input stored on a logged run for this case."}
              </p>
              {activeLoggedRun ? (
                <button type="button" onClick={() => setSheetRunId(null)} className="shrink-0 text-[11px] text-gray-400 transition-colors hover:text-gray-600">clear</button>
              ) : null}
            </div>
            <div className="relative">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button type="button" className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                    activeLoggedRun ? "border-gray-900 bg-gray-50 text-gray-900 ring-1 ring-gray-900" : "border-gray-200 bg-gray-50/50 text-gray-400 hover:border-gray-300"
                  )}>
                    <span className="flex min-w-0 items-center gap-2">
                      <History className="h-3.5 w-3.5 shrink-0 text-gray-400" aria-hidden />
                      <span className="truncate">{activeLoggedRun ? `${activeLoggedRun.label} · ${activeLoggedRun.meta}` : "Select a logged run…"}</span>
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 text-gray-400" aria-hidden />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-72">
                  <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Logged workflow runs</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {MOCK_LOGGED_RUNS.map((run) => (
                    <DropdownMenuItem
                      key={run.id}
                      onClick={() => { setSheetRunId(run.id) }}
                      className="flex flex-col items-start gap-0.5 py-2"
                    >
                      <span className="text-sm font-medium">{run.label}</span>
                      <span className="text-[11px] text-muted-foreground">{run.meta}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {activeLoggedRun && (
              <div className="flex flex-col gap-2">
                <p className="text-[11px] leading-relaxed text-gray-500">
                  {isTrigger
                    ? "Preview of the stored trigger payload. Applying replaces this case’s payload (and expected if present)."
                    : "Preview of the stored input. Applying replaces the editor and expected output for this case."}
                </p>
                <div className="rounded-md border border-gray-100 bg-gray-50/60 px-3 py-2">
                  <p className="line-clamp-4 text-xs leading-snug text-gray-700">{activeLoggedRun.input}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCases((prev) =>
                      prev.map((c) =>
                        c.id === inputSheet.caseId
                          ? { ...c, input: activeLoggedRun.input, expected: activeLoggedRun.expected }
                          : c,
                      ),
                    )
                    setInputDraft(activeLoggedRun.input)
                    setInputSheet(null)
                    setSheetRunId(null)
                    setInputSheetSource("manual")
                  }}
                  className="w-full rounded-lg border border-gray-900 bg-gray-900 py-2 text-xs font-medium text-white transition-colors hover:bg-gray-800"
                >
                  Use this run's input
                </button>
              </div>
            )}
          </div>
        )

        return (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={(e) => {
                const t = e.target as HTMLElement
                if (
                  t.closest('[data-slot="dropdown-menu-content"]') ||
                  t.closest('[data-slot="dropdown-menu-sub-content"]') ||
                  t.closest('[data-slot="select-content"]')
                ) {
                  return
                }
                setInputSheet(null)
                setSheetRunId(null)
                setInputSheetSource("manual")
              }}
            />
            <div className="fixed right-0 top-0 bottom-0 z-50 flex flex-col w-[420px] bg-white border-l border-gray-200 shadow-xl">

              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {isExpected ? "Expected output" : "Input"}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {isExpected ? "What the workflow should produce for this test case" : "What to send as the workflow input"}
                  </p>
                </div>
                <button type="button" onClick={() => { setInputSheet(null); setSheetRunId(null); setInputSheetSource("manual") }} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
              </div>

              <div className="flex-1 flex flex-col overflow-auto min-h-0">

                {/* ── Input / trigger: node type, source, content ── */}
                <div className={cn("flex-1 min-h-0 p-5 flex flex-col gap-3", !isExpected && "border-b border-gray-100")}>
                  {!isExpected ? (
                    <>
                      <div className="flex w-full shrink-0 flex-col gap-2">
                        <p className="text-xs font-medium text-gray-500">Select a Node from your workflow</p>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className="flex w-full items-center justify-between gap-2 rounded-lg border border-gray-200 bg-gray-50/50 px-3 py-2 text-left text-sm text-gray-900 transition-colors hover:border-gray-300"
                            >
                              <span className="flex min-w-0 items-center gap-2">
                                {inputMode === "input" ? (
                                  <TextCursorInput className="h-3.5 w-3.5 shrink-0 text-gray-500" aria-hidden />
                                ) : (
                                  <Zap className="h-3.5 w-3.5 shrink-0 text-gray-500" aria-hidden />
                                )}
                                <span className="truncate">{inputMode === "input" ? "Chatbot Input" : "Receive Email"}</span>
                              </span>
                              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-gray-400" aria-hidden />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-[12rem]">
                            <DropdownMenuItem
                              className={cn("gap-2", inputMode === "input" && "font-medium")}
                              onClick={() => setInputMode("input")}
                            >
                              <TextCursorInput className="h-3.5 w-3.5 shrink-0 text-gray-500" aria-hidden />
                              Chatbot Input
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className={cn("gap-2", inputMode === "trigger" && "font-medium")}
                              onClick={() => setInputMode("trigger")}
                            >
                              <Zap className="h-3.5 w-3.5 shrink-0 text-gray-500" aria-hidden />
                              Receive Email
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div className="flex w-full shrink-0 flex-col gap-2">
                        <p className="text-xs font-medium text-gray-500">Choose the content to be evaluated</p>
                        <Tabs
                          value={inputSheetSource}
                          onValueChange={(v) => {
                            const next = v as "manual" | "dataset" | "run"
                            if (next === "manual") {
                              setInputSheetSource("manual")
                              setSheetRunId(null)
                            } else if (next === "dataset") {
                              setInputSheetSource("dataset")
                              setSheetRunId(null)
                            } else {
                              setInputSheetSource("run")
                            }
                          }}
                          className="gap-2"
                        >
                          <TabsList className="border-gray-200 bg-gray-50/50 text-gray-600 grid h-auto w-full min-h-9 grid-cols-3 gap-0.5 rounded-lg p-1">
                            <TabsTrigger
                              value="manual"
                              className="h-auto min-h-[36px] gap-1.5 px-1.5 py-2 text-xs shadow-none data-[state=active]:border-gray-200 data-[state=active]:bg-white data-[state=active]:text-gray-900"
                            >
                              <TextCursorInput className="h-3.5 w-3.5 shrink-0 text-gray-500" aria-hidden />
                              <span className="truncate">Manual</span>
                            </TabsTrigger>
                            <TabsTrigger
                              value="dataset"
                              className="h-auto min-h-[36px] gap-1.5 px-1.5 py-2 text-xs shadow-none data-[state=active]:border-gray-200 data-[state=active]:bg-white data-[state=active]:text-gray-900"
                            >
                              <Database className="h-3.5 w-3.5 shrink-0 text-gray-400" aria-hidden />
                              <span className="truncate">Dataset</span>
                            </TabsTrigger>
                            <TabsTrigger
                              value="run"
                              className="h-auto min-h-[36px] gap-1.5 px-1.5 py-2 text-xs shadow-none data-[state=active]:border-gray-200 data-[state=active]:bg-white data-[state=active]:text-gray-900"
                            >
                              <History className="h-3.5 w-3.5 shrink-0 text-gray-400" aria-hidden />
                              <span className="truncate">Past run</span>
                            </TabsTrigger>
                          </TabsList>
                        </Tabs>
                      </div>

                      {inputSheetSource === "manual" && (
                        isTrigger ? (
                          <>
                            <p className="text-xs text-gray-400">Choose a sample payload</p>
                            <Select
                              value={selectedTriggerPayload?.payload}
                              onValueChange={(payload) => {
                                const option = TRIGGER_PAYLOADS.find((p) => p.payload === payload)
                                if (!option) return
                                setCases((prev) =>
                                  prev.map((c) => (c.id === inputSheet.caseId ? { ...c, input: option.payload } : c)),
                                )
                                setInputSheet(null)
                                setSheetRunId(null)
                                setInputSheetSource("manual")
                              }}
                            >
                              <SelectTrigger className="h-auto min-h-10 w-full border-gray-200 bg-gray-50/50 py-2.5 text-left text-sm text-gray-900 shadow-none hover:bg-gray-50/80 [&_svg]:shrink-0">
                                <SelectValue placeholder="Select sample payload…" />
                              </SelectTrigger>
                              <SelectContent
                                side="left"
                                align="start"
                                position="popper"
                                className="z-[100] w-[var(--radix-select-trigger-width)] max-w-[min(100vw-2rem,var(--radix-select-trigger-width))]"
                              >
                                {TRIGGER_PAYLOADS.map((option) => (
                                  <SelectItem
                                    key={option.label}
                                    value={option.payload}
                                    textValue={`${option.label} ${option.description}`}
                                    className="h-auto min-h-0 cursor-pointer items-start py-2.5"
                                  >
                                    <span className="flex w-full flex-col gap-0.5 text-left">
                                      <span className="text-sm font-medium text-gray-800">{option.label}</span>
                                      <span className="text-xs font-normal text-gray-400">{option.description}</span>
                                    </span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {selectedTriggerPayload ? (
                              <pre className="mt-1 overflow-x-auto rounded-md border border-gray-100 bg-gray-50/60 px-2 py-1.5 text-[10px] leading-relaxed text-gray-500">
                                {selectedTriggerPayload.payload}
                              </pre>
                            ) : null}
                          </>
                        ) : (
                          <textarea
                            autoFocus
                            value={inputDraft}
                            onChange={(e) => {
                              setInputDraft(e.target.value)
                              setCases(prev => prev.map(c => c.id === inputSheet.caseId ? { ...c, [inputSheet.field]: e.target.value } : c))
                            }}
                            placeholder="Enter test input…"
                            rows={5}
                            className="w-full resize-none rounded-lg border border-gray-200 bg-gray-50/50 px-3 py-2.5 font-mono text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
                          />
                        )
                      )}
                      {inputSheetSource === "dataset" && datasetPanelJsx}
                      {inputSheetSource === "run" && runPanelJsx}
                    </>
                  ) : null}
                  {isExpected ? (
                    <textarea
                      autoFocus
                      value={inputDraft}
                      onChange={(e) => {
                        setInputDraft(e.target.value)
                        setCases(prev => prev.map(c => c.id === inputSheet.caseId ? { ...c, [inputSheet.field]: e.target.value } : c))
                      }}
                      placeholder='e.g. {"severity":"CRITICAL"}'
                      rows={8}
                      className="w-full resize-none rounded-lg border border-gray-200 bg-gray-50/50 px-3 py-2.5 font-mono text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
                    />
                  ) : null}
                </div>

              </div>
            </div>
          </>
        )
      })()}

      {/* ── Cell detail side sheet ───────────────────────────────────── */}
      {cellSheet && (() => {
        const tc = cases.find(c => c.id === cellSheet.caseId)!
        const v  = variants.find(v => v.id === cellSheet.variantId)!
        const vIdx = Math.max(0, variants.findIndex((x) => x.id === v.id))
        const mockVKey = resolveExperimentMockVariantKey(v.id, vIdx)
        const mockCaseId = experimentMockBackingCaseId(tc.id)
        const output = getExperimentMockOutput(tc.id, v, mockVKey) ?? ""
        const outSrc = v.columnOutput ?? DEFAULT_EXPERIMENT_COLUMN_OUTPUT
        const sheetEvalDefs = evalDefs.filter((ev) => selectedEvalIds.includes(ev.id))
        const linkedAnalyticsRunId = analyticsRunIdForExperimentCase(tc)
        const signalLinkedCase =
          linkedAnalyticsRunId != null && ANALYTICS_SIGNAL_LINKED_RUN_IDS.has(linkedAnalyticsRunId)
        const cellSheetInputResolved = experimentTriggerPayloadForDisplay(tc.input)
        return (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setCellSheet(null)} />
            <div className="fixed right-0 top-0 bottom-0 z-50 flex flex-col w-[440px] bg-white border-l border-gray-200 shadow-xl">
              <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900 truncate">{v.label}</p>
                    <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-500">
                      Case {cases.indexOf(tc) + 1}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">
                    {cellSheetInputResolved.length > 60 ? cellSheetInputResolved.slice(0, 60) + "…" : cellSheetInputResolved}
                  </p>
                </div>
                <button type="button" onClick={() => setCellSheet(null)} className="shrink-0 text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
              </div>
              <div className="flex-1 flex flex-col gap-0 overflow-auto divide-y divide-gray-100">
                <div className="flex flex-col gap-1.5 px-5 py-4">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">Input</p>
                  {cellSheetInputResolved.trimStart().startsWith("{") ? (
                    <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5 text-[12px] font-mono text-gray-700 leading-relaxed">
                      {cellSheetInputResolved}
                    </pre>
                  ) : (
                    <p className="text-sm text-gray-700 leading-relaxed">{cellSheetInputResolved}</p>
                  )}
                </div>
                {tc.expected && (
                  <div className="flex flex-col gap-1.5 px-5 py-4">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">Expected</p>
                    <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5 text-[12px] font-mono text-gray-600 leading-relaxed">{tc.expected}</pre>
                  </div>
                )}
                <CellSheetOutputPanel output={output} sourceLabel={getExperimentColumnOutputLabel(outSrc)} />
                <div className="flex flex-col gap-3 px-5 py-4">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">Scores</p>
                  {sheetEvalDefs.length === 0 ? (
                    <p className="text-[12px] text-gray-400 leading-snug">No evals selected for this experiment.</p>
                  ) : (
                    sheetEvalDefs.map((ev) => {
                      const score = resolveExperimentCellScore(mockCaseId, v.id, mockVKey, ev.id)
                      const match = MOCK_CELL_MATCH[mockCaseId]?.[v.id] ?? MOCK_CELL_MATCH[mockCaseId]?.[mockVKey] ?? null
                      const explanation = resolveExperimentCellExplanation(
                        mockCaseId,
                        v.id,
                        mockVKey,
                        ev.id,
                        ev.label,
                      )
                      const state = ev.type !== "reference" && score !== null ? scorePassFail(score, ev.passThreshold) : "neutral"
                      return (
                        <div
                          key={ev.id}
                          className={cn(
                            "flex flex-col gap-2 rounded-lg border px-3 py-2.5",
                            state === "fail" && signalLinkedCase && "border-yellow-200 bg-yellow-50/80",
                            state === "fail" && !signalLinkedCase && "border-red-100 bg-red-50/50",
                            state !== "fail" && "border-gray-100 bg-gray-50/50",
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[13px] font-medium text-gray-700">{ev.label}</span>
                            {ev.type === "reference" ? (
                              <MatchChip match={match} />
                            ) : (
                              <ScoreChip
                                score={score}
                                threshold={ev.passThreshold}
                                signalRow={signalLinkedCase}
                              />
                            )}
                          </div>
                          {explanation && (
                            <p className="text-[12px] text-gray-500 leading-snug">{explanation}</p>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
                {linkedAnalyticsRunId && tabContext?.openAnalyticsRunDetailForRun ? (
                  <div className="px-5 py-4">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9 w-full gap-2 border-gray-200 bg-white text-gray-800 hover:bg-gray-50"
                      onClick={() => {
                        tabContext.openAnalyticsRunDetailForRun(linkedAnalyticsRunId)
                        setCellSheet(null)
                      }}
                    >
                      View run timeline in Analytics
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
          </>
        )
      })()}

      {/* ── Node config side sheet ───────────────────────────────────── */}
      {nodeSheet && (() => {
        const variant = variants.find((x) => x.id === nodeSheet.variantId)!
        const cfg = getEffectiveNodeConfig(variant, nodeConfigs)
        const selectedNode = cfg.nodeId ? WORKFLOW_NODES.find(n => n.id === cfg.nodeId) ?? null : null
        const setField = (key: string, value: string) => {
          setNodeConfigs(prev => ({ ...prev, [nodeSheet.variantId]: { nodeId: cfg.nodeId, values: { ...(cfg.values ?? {}), [key]: value } } }))
        }
        const selectNode = (nodeId: string) => {
          setNodeConfigs((prev) => {
            const prevEntry = prev[nodeSheet.variantId]
            if (prevEntry?.nodeId === nodeId) {
              return { ...prev, [nodeSheet.variantId]: { nodeId, values: prevEntry.values ?? {} } }
            }
            const eff = getEffectiveNodeConfig(variant, prev)
            if (eff.nodeId === nodeId) {
              return { ...prev, [nodeSheet.variantId]: { nodeId, values: { ...eff.values } } }
            }
            return { ...prev, [nodeSheet.variantId]: { nodeId, values: {} } }
          })
        }
        const snapshotIdForVariant =
          variantWorkflowSnapshotId[nodeSheet.variantId] ?? WORKFLOW_VERSION_CHOICES[0].id
        const snapshotMeta = WORKFLOW_VERSION_CHOICES.find((s) => s.id === snapshotIdForVariant)
        const sheetSubtitle =
          nodeSheetMode === "workflow-version" ? "workflow version" : "node override"
        return (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setNodeSheet(null)} />
            <div className="fixed right-0 top-0 bottom-0 z-50 flex flex-col w-96 bg-white border-l border-gray-200 shadow-xl">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{nodeSheet.variantLabel}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{sheetSubtitle}</p>
                </div>
                <button type="button" onClick={() => setNodeSheet(null)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
              </div>
              <div className="flex-1 overflow-auto p-5 flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="variant-change-type" className="text-xs font-normal text-gray-500">
                    What do you want to change?
                  </Label>
                  <Select
                    value={nodeSheetMode}
                    onValueChange={(v) => setNodeSheetMode(v as "workflow-version" | "node-config")}
                  >
                    <SelectTrigger id="variant-change-type" className="h-9 w-full bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="workflow-version">Use a previous workflow version</SelectItem>
                      <SelectItem value="node-config">Edit node configuration</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {nodeSheetMode === "workflow-version" && (
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="workflow-snapshot" className="text-xs font-normal text-gray-500">
                        Workflow version
                      </Label>
                      <Select
                        value={snapshotIdForVariant}
                        onValueChange={(id) =>
                          setVariantWorkflowSnapshotId((prev) => ({
                            ...prev,
                            [nodeSheet.variantId]: id,
                          }))
                        }
                      >
                        <SelectTrigger id="workflow-snapshot" className="h-9 w-full bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {WORKFLOW_VERSION_CHOICES.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {snapshotMeta && (
                      <p className="text-xs text-gray-500 leading-relaxed">{snapshotMeta.hint}</p>
                    )}
                  </div>
                )}

                {nodeSheetMode === "node-config" && (
                  <>
                    <div className="flex flex-col gap-2">
                      <p className="text-xs text-gray-400">Workflow node</p>
                      <WorkflowNodePicker selectedId={cfg.nodeId} onSelect={selectNode} />
                    </div>
                    <VariantNodeConfigFields
                      selectedNode={selectedNode}
                      values={cfg.values ?? {}}
                      onFieldChange={setField}
                      showSectionHeader
                    />
                  </>
                )}
              </div>
            </div>
          </>
        )
      })()}

      <Drawer
        open={addVariantOpen}
        onOpenChange={(open) => {
          setAddVariantOpen(open)
          if (open) setNewVariantDraft(emptyNewVariantDraft())
        }}
        direction="right"
      >
        <DrawerContent className="ml-auto flex h-full max-h-[100dvh] w-full max-w-[440px] flex-col gap-0 border-l p-0 data-[vaul-drawer-direction=right]:sm:max-w-[440px]">
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5 border-b border-border/60 pb-4 text-left">
                <DrawerTitle>Workflow variant</DrawerTitle>
                <DrawerDescription className="text-left">
                  Add a column that replays your cases with different workflow settings so you can compare outputs to the
                  baseline after a run.
                </DrawerDescription>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-medium text-muted-foreground">Node to change</p>
                  <TooltipProvider delayDuration={200}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          aria-label="About step to change"
                        >
                          <Info className="size-3.5" aria-hidden />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[260px] text-xs leading-snug">
                        Choose which workflow node should use the overrides below. Other steps stay aligned with the
                        baseline column.
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <WorkflowNodePicker
                  selectedId={newVariantDraft.nodeId}
                  onSelect={selectDraftNode}
                  placeholder="Select step to change"
                />
              </div>
              {newVariantDraft.nodeId ? (
                <div className="space-y-2">
                  <div className="h-px bg-border/60" />
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-medium text-muted-foreground">make changes</p>
                    <TooltipProvider delayDuration={200}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            className="inline-flex shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            aria-label="About settings to compare"
                          >
                            <Info className="size-3.5" aria-hidden />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[260px] text-xs leading-snug">
                          Edit only what you want to test (for example model or system prompt). Values start from the
                          baseline so you can tweak instead of retyping.
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <VariantNodeConfigFields
                    selectedNode={WORKFLOW_NODES.find((n) => n.id === newVariantDraft.nodeId) ?? null}
                    values={newVariantDraft.values}
                    onFieldChange={setDraftField}
                    showSectionHeader={false}
                    afterFirstField={
                      <Alert className="border-border/80 bg-muted/40 py-3 text-foreground [&>svg]:text-muted-foreground">
                        <Info className="size-4 shrink-0" aria-hidden />
                        <AlertTitle className="text-xs font-medium">Pinned nodes</AlertTitle>
                        <AlertDescription className="text-[11px] leading-snug text-muted-foreground">
                          All workflow nodes except the one you configure stay pinned to the baseline and do not change
                          between runs.
                        </AlertDescription>
                      </Alert>
                    }
                  />
                </div>
              ) : null}
            </div>
          </div>
          <DrawerFooter className="flex flex-row flex-wrap justify-end gap-2 border-t border-border/60 sm:justify-end">
            <DrawerClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DrawerClose>
            <Button type="button" onClick={commitNewVariant} disabled={!newVariantDraft.nodeId}>
              Add variant
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <SaveRunToDatabaseModal
        open={saveToDatasetOpen}
        onOpenChange={setSaveToDatasetOpen}
        runId={saveToDatasetRunId}
      />
    </div>
  )
}

const DIALOG_EVAL_TYPES = ["LLM judge", "Expected Output", "Contains", "Regex"] as const

function mapStoredEvalTypeToDialog(stored: string): string {
  const trimmed = stored.trim()
  if (trimmed === "Compare to expected output") return "Expected Output"
  if (DIALOG_EVAL_TYPES.includes(trimmed as (typeof DIALOG_EVAL_TYPES)[number])) return trimmed
  const lower = stored.toLowerCase()
  if (lower.includes("regex")) return "Regex"
  if (lower.includes("contain")) return "Contains"
  if (lower.includes("reference") || lower.includes("match") || lower.includes("expected output"))
    return "Expected Output"
  return "LLM judge"
}

const EVAL_TYPE_DIALOG_OPTIONS: { value: string; label: string; description: string }[] = [
  {
    value: "LLM judge",
    label: "LLM judge",
    description: "Uses a model with your rubric to score each output, instead of matching a fixed reference string.",
  },
  {
    value: "Expected Output",
    label: "Expected Output",
    description: "Compares the node output to the expected answer you set per row in the experiment table.",
  },
  {
    value: "Rule validator",
    label: "Rule validator",
    description: "Treats each line as a rule and passes only when every rule matches the output.",
  },
  {
    value: "Contains",
    label: "Contains",
    description: "Passes when the output includes the phrase or substring you configure (case-sensitive by default).",
  },
  {
    value: "Regex",
    label: "Regex",
    description: "Passes when your regular expression matches the output or a substring, depending on how you configure the eval.",
  },
]

function parseAutoRunFromStored(runWhen: string): boolean {
  const s = runWhen.toLowerCase()
  if (s.includes("manual only")) return false
  return true
}

/** Human-readable schedule for tooltips; strips redundant "— auto" suffix from stored labels. */
function autoRunScheduleSummary(runWhen: string): string {
  const trimmed = runWhen.trim()
  return trimmed.replace(/\s*[—–-]\s*auto\s*$/i, "").trim() || trimmed
}

function parseSamplePctFromStored(runScope: string): string {
  const m = runScope.match(/(\d+)\s*%/)
  if (m) return m[1]
  return "10"
}

const SAMPLE_RATE_MIN = 1
const SAMPLE_RATE_MAX = 10

/** Who production autorun applies to (prototype). Keys stored in runScope prefix. */
const RUN_AUDIENCE_OPTIONS: { value: string; label: string; group: "all" | "groups" | "roles" }[] = [
  { value: "all", label: "All users & roles", group: "all" },
  { value: "group-eng", label: "Engineering", group: "groups" },
  { value: "group-support", label: "Support", group: "groups" },
  { value: "group-sales", label: "Sales", group: "groups" },
  { value: "group-success", label: "Customer success", group: "groups" },
  { value: "role-admin", label: "Admin", group: "roles" },
  { value: "role-agent", label: "Agent", group: "roles" },
  { value: "role-viewer", label: "Viewer", group: "roles" },
]

const runAudienceLabels: Record<string, string> = Object.fromEntries(
  RUN_AUDIENCE_OPTIONS.map((o) => [o.value, o.label]),
)

function clampSampleRatePct(raw: string): string {
  const n = parseInt(raw, 10)
  if (Number.isNaN(n)) return String(SAMPLE_RATE_MAX)
  return String(Math.min(SAMPLE_RATE_MAX, Math.max(SAMPLE_RATE_MIN, n)))
}

const DEFAULT_LLM_JUDGE_MODEL = "gpt-4o"

/** Starter rubric shown when creating or switching to an LLM judge eval; user can edit freely. */
const DEFAULT_LLM_JUDGE_RUBRIC = `Accuracy (0–10): Does the reply correctly address the user's issue?
Tone (0–10): Is the reply empathetic and professional?
Format compliance: pass / fail

Even lightweight structure like this improves consistency and debuggability.`

const LLM_JUDGE_MODEL_OPTIONS: { value: string; label: string }[] = [
  { value: "gpt-4o", label: "GPT-4o" },
  { value: "gpt-4.1", label: "GPT-4.1" },
  { value: "o3-mini", label: "o3-mini" },
  { value: "claude-sonnet-4", label: "Claude Sonnet 4" },
]

function CreateEvaluatorDialog({
  open,
  onOpenChange,
  onSave,
  editingEvaluator,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (row: Omit<EvaluatorConfig, "id" | "ran">, editingId?: number) => void
  editingEvaluator: EvaluatorConfig | null
}) {
  const [name, setName] = useState("")
  const [evalSource, setEvalSource] = useState<WorkflowEvalSource | undefined>(undefined)
  const [evalType, setEvalType] = useState<string | undefined>(undefined)
  const [expected, setExpected] = useState("")
  const [judgeModel, setJudgeModel] = useState(DEFAULT_LLM_JUDGE_MODEL)
  const [autoRun, setAutoRun] = useState(false)
  const [runAudience, setRunAudience] = useState("all")
  const [sampleRate, setSampleRate] = useState("10")
  const [alertEnabled, setAlertEnabled] = useState(false)
  const [alertThreshold, setAlertThreshold] = useState("6")
  const prevEvalTypeForRubricRef = useRef<string | undefined>(undefined)

  useEffect(() => {
    if (!open) {
      prevEvalTypeForRubricRef.current = undefined
      return
    }
    if (editingEvaluator) return
    if (evalType === "LLM judge") {
      const prev = prevEvalTypeForRubricRef.current
      if (prev !== "LLM judge") {
        setExpected((cur) => (cur.trim() === "" ? DEFAULT_LLM_JUDGE_RUBRIC : cur))
      }
      prevEvalTypeForRubricRef.current = evalType
    } else {
      prevEvalTypeForRubricRef.current = evalType
    }
  }, [open, evalType, editingEvaluator])

  useEffect(() => {
    if (!open) return
    if (editingEvaluator) {
      setName(editingEvaluator.name)
      const { evalSource: src } = parseOutputForForm(editingEvaluator.output)
      setEvalSource(src)
      const dialogEvalType = mapStoredEvalTypeToDialog(editingEvaluator.type)
      setEvalType(dialogEvalType)
      const storedExpected = editingEvaluator.expected === "—" ? "" : editingEvaluator.expected
      setExpected(
        dialogEvalType === "LLM judge" && storedExpected.trim() === ""
          ? DEFAULT_LLM_JUDGE_RUBRIC
          : storedExpected,
      )
      prevEvalTypeForRubricRef.current = dialogEvalType
      setJudgeModel(editingEvaluator.judgeModel ?? DEFAULT_LLM_JUDGE_MODEL)
      setAutoRun(parseAutoRunFromStored(editingEvaluator.runWhen))
      setRunAudience("all")
      setSampleRate(clampSampleRatePct(parseSamplePctFromStored(editingEvaluator.runScope)))
      const hasThreshold = editingEvaluator.passThreshold != null
      setAlertEnabled(hasThreshold)
      setAlertThreshold(hasThreshold ? String(Math.round((editingEvaluator.passThreshold ?? 60) / 10)) : "6")
    } else {
      setName("")
      setEvalSource(undefined)
      setEvalType(undefined)
      setExpected("")
      prevEvalTypeForRubricRef.current = undefined
      setJudgeModel(DEFAULT_LLM_JUDGE_MODEL)
      setAutoRun(false)
      setRunAudience("all")
      setSampleRate("10")
      setAlertEnabled(false)
      setAlertThreshold("6")
    }
  }, [open, editingEvaluator])

  const runWhenLabel = autoRun
    ? "After each execution — auto"
    : "Manual only — run from Experiment when you choose"
  const audienceSummary = runAudienceLabels[runAudience] ?? runAudience
  const runScopeLabel = autoRun
    ? audienceSummary + " / " + sampleRate + "% sample" + (alertEnabled ? " / alert < " + alertThreshold : "")
    : "Manual scope"

  type Step4Config =
    | { kind: "hidden" }
    | { kind: "llm-judge"; hint: string }
    | { kind: "textarea"; title: string; placeholder: string; hint: string; mono?: boolean }
    | { kind: "rule"; title: string; placeholder: string; hint: string }

  const step4ForEvalType: Record<string, Step4Config> = {
    "LLM judge": {
      kind: "llm-judge",
      hint: "The judge uses this rubric to score each run — not a fixed reference string. Clear sections make scores easier to interpret and compare across variants.",
    },
    "Expected Output": {
      kind: "hidden",
    },
    /** Legacy stored dialog value — still resolves step 4 if present in state. */
    "Compare to expected output": {
      kind: "hidden",
    },
    "Rule validator": {
      kind: "rule",
      title: "Rule definition",
      placeholder: `e.g.

charge_age > 30d  →  escalate: true
priority: high    →  escalate: true
sentiment: frustrated  →  tone_score >= 4`,
      hint: "One rule per line. Each rule is evaluated against the node output. The eval passes if all rules match.",
    },
    Contains: {
      kind: "textarea",
      title: "Text that must appear",
      placeholder: "Enter the phrase or substring that must be present in the output…",
      hint: "Match is successful if this text appears anywhere in the evaluated output. Case-sensitive by default.",
    },
    Regex: {
      kind: "textarea",
      title: "Regular expression pattern",
      placeholder: 'e.g. ^\\s*\\{[\\s\\S]*"category"\\s*:\\s*"billing"[\\s\\S]*\\}\\s*$',
      hint: "The run passes if the pattern matches the full output or a substring (depending on your eval settings).",
      mono: true,
    },
  }

  const step4 =
    evalType != null ? (step4ForEvalType[evalType] ?? step4ForEvalType["LLM judge"]) : null

  const buildRow = (): Omit<EvaluatorConfig, "id" | "ran"> => {
    if (evalSource == null) throw new Error("evalSource is required to save")
    if (evalType == null) throw new Error("evalType is required to save")
    const outputLabel = outputLabelFromEvalSource(evalSource)
    const threshold = alertEnabled ? parseInt(alertThreshold, 10) * 10 : undefined
    const base: Omit<EvaluatorConfig, "id" | "ran"> = {
      name: name.trim() || "Untitled eval",
      output: outputLabel,
      type: evalType,
      expected: expected.trim() || "—",
      runWhen: runWhenLabel,
      runScope: runScopeLabel,
      passThreshold: threshold,
    }
    if (evalType === "LLM judge") return { ...base, judgeModel }
    return base
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[min(480px,95vw)] flex flex-col gap-0 p-0 overflow-hidden sm:max-w-none">
        <SheetHeader className="px-6 pt-6 pb-4 space-y-1.5 border-b border-border/60">
          <SheetTitle>{editingEvaluator ? "Edit eval" : "New eval"}</SheetTitle>
          <p className="text-sm text-muted-foreground">Configure what to score, how to compare it, and when to run automatically.</p>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-6">
          <section className="space-y-2">
            <Label htmlFor="eval-name">Eval name</Label>
            <Input
              id="eval-name"
              placeholder="e.g. Ticket categorization quality"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-9"
            />
          </section>

          <section className="space-y-2">
            <Label>Node to evaluate</Label>
            <Select
              value={evalSource}
              onValueChange={(v) => setEvalSource(v as WorkflowEvalSource)}
            >
              <SelectTrigger className="w-full h-9">
                <span className="flex min-w-0 flex-1 items-center gap-2">
                  <SelectValue placeholder="Select Node" />
                </span>
              </SelectTrigger>
              <SelectContent className="max-h-[min(70vh,28rem)]">
                <SelectItem value="output-1" textValue="Output 1">
                  <span className="flex items-center gap-2">
                    <EvaluatedSourceIcon evalSource="output-1" />
                    Output 1
                  </span>
                </SelectItem>
                <SelectItem value="output-2" textValue="Output 2">
                  <span className="flex items-center gap-2">
                    <EvaluatedSourceIcon evalSource="output-2" />
                    Output 2
                  </span>
                </SelectItem>
                <SelectSeparator />
                {GANTT_NODES.map((node) => (
                  <SelectItem key={node.id} value={node.id} textValue={node.label}>
                    <span className="flex items-center gap-2 min-w-0">
                      <GanttNodeIcon type={node.icon} />
                      <span className="truncate">{node.label}</span>
                    </span>
                  </SelectItem>
                ))}
                <SelectSeparator />
                {WORKFLOW_NODES.map((n) => (
                  <SelectItem key={n.id} value={n.id} textValue={n.label}>
                    <span className="flex items-center gap-2">
                      <WorkflowNodeLucideIcon kind={n.iconKind} />
                      {n.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </section>

          <Separator />

          <section className="space-y-2">
            <Label>Evaluation type</Label>
            <Select value={evalType} onValueChange={setEvalType}>
              <SelectTrigger className="w-full h-9">
                <SelectValue placeholder="Choose evaluation type" />
              </SelectTrigger>
              <SelectContent
                align="end"
                side="bottom"
                position="popper"
                collisionPadding={12}
                className="z-[110] max-h-[min(70vh,28rem)] min-w-[var(--radix-select-trigger-width)] max-w-[min(28rem,calc(100vw-1.5rem))]"
              >
                {EVAL_TYPE_DIALOG_OPTIONS.map((option) => (
                  <SelectItem
                    key={option.value}
                    value={option.value}
                    itemText={option.label}
                    textValue={`${option.label} ${option.description}`}
                    className="h-auto min-h-0 cursor-pointer flex-col items-stretch gap-0.5 py-2.5"
                  >
                    <span className="text-xs font-normal leading-snug text-muted-foreground text-left">
                      {option.description}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </section>

          {step4 == null ? null : step4.kind === "hidden" ? (
            <section className="space-y-2">
              <Label>Ground truth (expected output)</Label>
              {autoRun ? (
                <>
                  <Textarea
                    id="eval-expected-fixed"
                    aria-label="Fixed expected output"
                    placeholder="Enter the exact output you expect the model to produce on live runs…"
                    value={expected}
                    onChange={(e) => setExpected(e.target.value)}
                    rows={4}
                    className="min-h-[100px] resize-y text-sm"
                  />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Used as the reference for every live run scored by this eval. Unlike experiments, production runs have no per-row gold answer, so this fixed string is compared against each output.
                  </p>
                </>
              ) : (
                <div className="rounded-md border border-dashed border-border bg-muted/30 px-4 py-3 flex gap-3 items-start">
                  <span className="mt-0.5 text-muted-foreground">
                    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7.5 1C3.91015 1 1 3.91015 1 7.5C1 11.0899 3.91015 14 7.5 14C11.0899 14 14 11.0899 14 7.5C14 3.91015 11.0899 1 7.5 1ZM6.8 4.5C6.8 4.11340 7.11340 3.8 7.5 3.8C7.88660 3.8 8.2 4.11340 8.2 4.5C8.2 4.88660 7.88660 5.2 7.5 5.2C7.11340 5.2 6.8 4.88660 6.8 4.5ZM8 11H7V6.5H8V11Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd" /></svg>
                  </span>
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium text-foreground">Comes from each test case row</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      This eval compares the model output against the expected output you set per row in the experiment table — not a single fixed reference. Each test case can have its own gold answer.
                    </p>
                  </div>
                </div>
              )}
            </section>
          ) : step4.kind === "llm-judge" ? (
            <section className="space-y-2">
              <div className="space-y-1.5">
                <Label htmlFor="eval-judge-model" className="text-xs text-muted-foreground font-normal">
                  Judge model
                </Label>
                <Select value={judgeModel} onValueChange={setJudgeModel}>
                  <SelectTrigger id="eval-judge-model" className="w-full h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LLM_JUDGE_MODEL_OPTIONS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Textarea
                id="eval-expected"
                aria-label="Scoring rubric"
                value={expected}
                onChange={(e) => setExpected(e.target.value)}
                rows={6}
                className="min-h-[100px] resize-y text-sm"
              />
              <p className="text-xs text-muted-foreground leading-relaxed">{step4.hint}</p>
            </section>
          ) : step4.kind === "rule" ? (
            <section className="space-y-2">
              <Label htmlFor="eval-expected">{step4.title}</Label>
              <Textarea
                id="eval-expected"
                placeholder={step4.placeholder}
                value={expected}
                onChange={(e) => setExpected(e.target.value)}
                rows={5}
                className="min-h-[110px] resize-y text-sm font-mono"
              />
              <p className="text-xs text-muted-foreground leading-relaxed">{step4.hint}</p>
            </section>
          ) : (
            <section className="space-y-2">
              <Label htmlFor="eval-expected">{step4.title}</Label>
              <Textarea
                id="eval-expected"
                placeholder={step4.placeholder}
                value={expected}
                onChange={(e) => setExpected(e.target.value)}
                rows={4}
                className={cn(
                  "min-h-[100px] resize-y text-sm",
                  step4.mono && "font-mono",
                )}
              />
              <p className="text-xs text-muted-foreground leading-relaxed">{step4.hint}</p>
            </section>
          )}

          {evalType != null && (
            <div className="space-y-3 rounded-lg border border-border/60 bg-muted/30 px-4 py-3.5 dark:border-border/50 dark:bg-muted/15">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="eval-signal-threshold-slider" className="text-xs font-medium text-foreground/80">
                  Fail threshold
                </Label>
                <span className="text-xs font-semibold tabular-nums text-foreground">
                  {alertThreshold}.0 / 10
                </span>
              </div>
              <input
                id="eval-signal-threshold-slider"
                type="range"
                min={1}
                max={9}
                step={1}
                value={alertThreshold}
                onChange={(e) => setAlertThreshold(e.target.value)}
                className="w-full accent-primary h-1.5 cursor-pointer"
              />
            </div>
          )}

          <Separator />

          <section className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1 pr-2">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium">Run automatically in production</p>
                  <TooltipProvider delayDuration={200}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex h-4 w-4 items-center justify-center rounded text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                          aria-label="Why enable automatic run scoring"
                        >
                          <Info className="h-3.5 w-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" align="start" className="max-w-[280px] text-xs leading-relaxed">
                        Score real runs automatically and emit a signal when quality drops.
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
              <Switch checked={autoRun} onCheckedChange={setAutoRun} />
            </div>

            {autoRun && (
              <div className="space-y-4 pt-1">
                {/* Audience: groups & roles */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground font-normal">Groups & roles</Label>
                  <Select value={runAudience} onValueChange={setRunAudience}>
                    <SelectTrigger className="h-9 w-full bg-background">
                      <SelectValue placeholder="Who this run applies to" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[min(70vh,22rem)]">
                      <SelectGroup>
                        <SelectLabel className="text-[11px]">Everyone</SelectLabel>
                        {RUN_AUDIENCE_OPTIONS.filter((o) => o.group === "all").map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                      <SelectSeparator />
                      <SelectGroup>
                        <SelectLabel className="text-[11px]">Groups</SelectLabel>
                        {RUN_AUDIENCE_OPTIONS.filter((o) => o.group === "groups").map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                      <SelectSeparator />
                      <SelectGroup>
                        <SelectLabel className="text-[11px]">Roles</SelectLabel>
                        {RUN_AUDIENCE_OPTIONS.filter((o) => o.group === "roles").map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Only runs initiated by users in this audience are scored automatically.
                  </p>
                </div>

                {/* Sample rate */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground font-normal">Sample rate</Label>
                    <span className="text-xs font-medium tabular-nums">{sampleRate}%</span>
                  </div>
                  <input
                    type="range"
                    min={SAMPLE_RATE_MIN}
                    max={SAMPLE_RATE_MAX}
                    step={1}
                    value={sampleRate}
                    onChange={(e) => setSampleRate(clampSampleRatePct(e.target.value))}
                    className="w-full accent-primary h-1.5 cursor-pointer"
                  />
                  <p className="text-xs text-muted-foreground">
                    Scores roughly {sampleRate}% of live runs at random.
                  </p>
                </div>

                {/* Signal threshold — standalone section (not a loose bordered div) */}
                <section
                  aria-labelledby="eval-signal-threshold-title"
                  className={cn(
                    "overflow-hidden rounded-lg border transition-colors",
                    alertEnabled
                      ? "border-border/80 bg-muted/25 shadow-sm dark:border-border/60 dark:bg-muted/20"
                      : "border-border/70 bg-muted/20",
                  )}
                >
                  <header
                    className={cn(
                      "flex items-start justify-between gap-3 px-4 py-3.5",
                      alertEnabled && "border-b border-border/60 dark:border-border/50",
                    )}
                  >
                    <div className="flex min-w-0 flex-1 gap-3">
                      <div
                        className={cn(
                          "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md border",
                          alertEnabled
                            ? "border-border/60 bg-muted/50 text-foreground dark:border-border/50 dark:bg-muted/40 dark:text-foreground"
                            : "border-border/60 bg-background text-muted-foreground",
                        )}
                        aria-hidden
                      >
                        <Target className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 pt-0.5">
                        <h3 id="eval-signal-threshold-title" className="text-sm font-semibold leading-tight tracking-tight">
                          Emit Signal when score drops below
                        </h3>
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                          Creates an entry in the Signals tab for any failing run.
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={alertEnabled}
                      onCheckedChange={setAlertEnabled}
                      className="shrink-0"
                      aria-labelledby="eval-signal-threshold-title"
                    />
                  </header>
                </section>
              </div>
            )}
          </section>
        </div>
        <SheetFooter className="px-6 py-4 border-t border-border/60 gap-2 flex-row justify-end bg-muted/10">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={evalSource == null || evalType == null}
            onClick={() => {
              if (evalSource == null || evalType == null) return
              onSave(buildRow(), editingEvaluator?.id)
              onOpenChange(false)
            }}
          >
            {editingEvaluator ? "Save changes" : "Save eval"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

// ─── Evaluators Tab ────────────────────────────────────────────────────────────

const INITIAL_EVALUATORS: EvaluatorConfig[] = [
  {
    id: 2,
    name: "Tone & empathy",
    output: "Output → output",
    type: "LLM judge",
    judgeModel: "gpt-4o",
    expected: "1–5 scale · must acknowledge frustration for priority:high tickets",
    runWhen: "Manual only — run from Experiment when you choose",
    runScope: "Manual scope",
    ran: "214 runs",
    passThreshold: 60,
  },
  {
    id: 3,
    name: "Resolution completeness",
    output: "Draft Response → output",
    type: "LLM judge",
    judgeModel: "gpt-4.1",
    expected: "Did the reply fully resolve the issue or provide a clear next step?",
    runWhen: "On batch finish + when you export results",
    runScope: "Rows with gold label · all variants",
    ran: "531 runs",
    passThreshold: 70,
  },
  {
    id: 1,
    name: "Response accuracy",
    output: "Draft Response → output",
    type: "Expected Output",
    expected: 'Match against gold reply — normalize whitespace, ignore greeting',
    runWhen: "After each cell completes — auto",
    runScope: "Full table · all variants · every user_id",
    ran: "531 runs",
  },
]

/** Evaluators tab table — 6 tracks (Type merged into Eval); Criteria gets the most flex; Mode stays narrow. */
const EVALUATOR_TABLE_COL =
  "grid w-full grid-cols-[minmax(176px,1.25fr)_minmax(104px,0.78fr)_minmax(200px,2.35fr)_minmax(80px,0.52fr)_minmax(84px,0.62fr)_44px] gap-4 items-center"

/** Signals tab — linked evaluator sits under signal name (no separate Evaluator column) */
const SIGNAL_TABLE_COL =
  "grid grid-cols-[minmax(200px,1.55fr)_minmax(100px,0.7fr)_minmax(128px,0.85fr)_minmax(100px,0.65fr)_minmax(60px,0.5fr)_40px] gap-4 items-center"

function datasetFormatAccent(format: string): string {
  const f = format.toLowerCase()
  if (f.includes("parquet")) return "bg-emerald-500"
  if (f.includes("json")) return "bg-sky-500"
  if (f.includes("csv")) return "bg-amber-500"
  return "bg-neutral-400"
}

function signalKindAccent(kind: string): string {
  const k = kind.toLowerCase()
  if (k.includes("score") || k.includes("accuracy")) return "bg-emerald-500"
  if (k.includes("latency")) return "bg-sky-500"
  return "bg-neutral-400"
}

/** Slim tip row: soft contrast fill, doc icon + short copy (text column fills banner width). */
export function ManusTipBanner({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed) return null
  return (
    <div
      className={cn(
        "w-full min-w-0 rounded-xl bg-[#e8e9ed] px-4 py-3 dark:bg-neutral-800/90",
        className,
      )}
    >
      <div className="flex w-full min-w-0 items-center gap-3">
        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        <div className="min-w-0 flex-1 text-sm leading-snug text-foreground [&_p]:m-0 [&_p]:w-full [&_p]:max-w-none">
          {children}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7 shrink-0 text-muted-foreground hover:bg-black/5 hover:text-foreground dark:hover:bg-white/10 [&_svg]:size-4"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss tip"
        >
          <X />
        </Button>
      </div>
    </div>
  )
}

function EvaluatorsTab({
  evaluators,
  onOpenCreateEvaluator,
  onEditEvaluator,
  onDeleteEvaluator,
  onCreateSignalFromEvaluator,
  onTestInExperiment,
}: {
  evaluators: EvaluatorConfig[]
  onOpenCreateEvaluator: () => void
  onEditEvaluator: (ev: EvaluatorConfig) => void
  onDeleteEvaluator: (index: number) => void
  onCreateSignalFromEvaluator: (ev: EvaluatorConfig) => void
  onTestInExperiment: (rowIndex: number) => void
}) {
  return (
    <TooltipProvider delayDuration={250}>
    <div className="flex flex-col h-full p-6 gap-4">
      <ManusTipBanner>
        <p>
          <span className="font-medium text-foreground">Evaluators</span> score runs with criteria you set. Attach them
          to production runs or test them in the <span className="font-medium">Experiments</span> tab, then open that
          run&apos;s <span className="font-medium">Analytics</span> tab to see scores.
        </p>
      </ManusTipBanner>
      <div className="flex justify-end">
        <Button variant="outline" size="sm" className="h-8 shrink-0" onClick={onOpenCreateEvaluator}>
          + New Eval
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border/80 bg-background shadow-sm">
        {/* Table header — Vercel-style: horizontal rules only, muted labels */}
        <div
          className={cn(
            EVALUATOR_TABLE_COL,
            "w-full min-w-[960px] px-4 py-2.5 border-b border-border/70 bg-muted/30 text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
          )}
        >
          <span>Eval</span>
          <span>What to evaluate</span>
          <span>Criteria</span>
          <span>Mode</span>
          <span className="text-right">Runs</span>
          <span className="sr-only">Actions</span>
        </div>

        <div className="w-full min-w-[960px] divide-y divide-border/70">
          {evaluators.map((ev, rowIndex) => {
            const evaluatedSelectLabel = evaluatedSelectLabelFromOutput(ev.output)
            const evaluatedSource = parseOutputForForm(ev.output).evalSource
            return (
            <div
              key={ev.id}
              className={cn(
                EVALUATOR_TABLE_COL,
                "group px-4 py-4 min-h-[4.25rem] transition-colors",
                "hover:bg-muted/40",
                ev.name && "cursor-pointer"
              )}
              onClick={() => {
                if (ev.name) onEditEvaluator(ev)
              }}
            >
              <div className="min-w-0 flex flex-col gap-1">
                {ev.name ? (
                  <span className="text-sm font-semibold text-foreground truncate">{ev.name}</span>
                ) : (
                  <span className="text-sm text-muted-foreground">—</span>
                )}
                {ev.type ? (
                  <span className="text-[13px] text-foreground">{ev.type}</span>
                ) : (
                  <span className="text-[13px] text-muted-foreground/50">—</span>
                )}
              </div>

              <div className="min-w-0 flex items-center gap-2">
                <EvaluatedSourceIcon evalSource={evaluatedSource} size="md" />
                <span className="text-[13px] text-foreground truncate block min-w-0" title={evaluatedSelectLabel}>
                  {evaluatedSelectLabel}
                </span>
              </div>

              <div className="min-w-0">
                {ev.type === "LLM judge" ? (
                  <div className="flex flex-col gap-1">
                    {ev.expected && ev.expected !== "—" ? (
                      <p
                        className="text-[13px] text-muted-foreground leading-snug line-clamp-2"
                        title={ev.expected}
                      >
                        {ev.expected}
                      </p>
                    ) : (
                      <span className="text-[12px] text-muted-foreground/60">No rubric</span>
                    )}
                    {ev.passThreshold != null && (
                      <span className="inline-flex w-fit items-center gap-1 rounded border border-border/70 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                        <Target className="h-2.5 w-2.5 shrink-0" aria-hidden />
                        pass &ge; {(ev.passThreshold / 10).toFixed(1)}
                      </span>
                    )}
                  </div>
                ) : ev.expected && ev.expected !== "—" ? (
                  <div className="flex flex-col gap-1">
                    <p
                      className="text-[13px] text-muted-foreground leading-snug line-clamp-2"
                      title={ev.expected}
                    >
                      {ev.expected}
                    </p>
                    {ev.passThreshold != null && (
                      <span className="inline-flex w-fit items-center gap-1 rounded border border-border/70 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                        <Target className="h-2.5 w-2.5 shrink-0" aria-hidden />
                        pass &ge; {(ev.passThreshold / 10).toFixed(1)}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-[13px] text-muted-foreground/50">—</span>
                )}
              </div>

              {/* Mode badge: Autorun (green pulsing dot) vs Manual (muted) */}
              <div className="min-w-0">
                {parseAutoRunFromStored(ev.runWhen) ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 cursor-default">
                        <span className="relative flex h-1.5 w-1.5 shrink-0">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        </span>
                        Autorun
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[280px] text-xs leading-relaxed">
                      Runs {autoRunScheduleSummary(ev.runWhen).replace(/^./, (c) => c.toLowerCase())}
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/40" />
                    Manual
                  </span>
                )}
              </div>

              {/* Runs — click navigates to Analytics */}
              <div className="flex justify-end">
                {ev.ran ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      tabCtx?.setActiveTab("Analytics")
                    }}
                    className="tabular-nums text-[13px] font-medium text-foreground underline-offset-2 hover:underline hover:text-foreground/80 transition-colors"
                  >
                    {ev.ran}
                  </button>
                ) : (
                  <span className="text-[13px] text-muted-foreground/50">—</span>
                )}
              </div>

              {ev.name ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100 data-[state=open]:opacity-100"
                      aria-label="Eval actions"
                      onClick={(e) => e.stopPropagation()}
                      onPointerDown={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuItem
                      className="gap-2"
                      onClick={() => onEditEvaluator(ev)}
                    >
                      <Pencil className="h-4 w-4 shrink-0 opacity-70" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="gap-2"
                      onClick={() => onTestInExperiment(rowIndex)}
                    >
                      <FlaskConical className="h-4 w-4 shrink-0 opacity-70" />
                      Test in Experiment
                    </DropdownMenuItem>
                    <TooltipProvider delayDuration={200}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <DropdownMenuItem
                            className="gap-2"
                            onClick={() => onCreateSignalFromEvaluator(ev)}
                          >
                            <Zap className="h-4 w-4 shrink-0 opacity-70" />
                            Create a signal
                          </DropdownMenuItem>
                        </TooltipTrigger>
                        <TooltipContent side="left" className="max-w-[260px] text-xs leading-relaxed">
                          Subscribe this eval’s results (scores or pass/fail) to the Signals tab so you can chart
                          trends, compare runs, and get alerts when quality drops.
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="gap-2 text-destructive focus:text-destructive"
                      onClick={() => onDeleteEvaluator(rowIndex)}
                    >
                      <Trash2 className="h-4 w-4 shrink-0 opacity-70" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <span />
              )}
            </div>
            )
          })}
        </div>
      </div>
    </div>
    </TooltipProvider>
  )
}

// ─── Dataset Tab ───────────────────────────────────────────────────────────────

type DatasetCase = {
  id: string
  input: string
  expected: string
}

type DatasetItem = {
  id: string
  name: string
  description: string
  cases: DatasetCase[]
  updated: string
  badge?: string
}

const INITIAL_DATASET_ITEMS: DatasetItem[] = [
  {
    id: "ds-billing",
    name: "Billing disputes",
    description: "Cancellation and charge dispute tickets with expected escalation outputs.",
    badge: "Primary",
    updated: "Apr 16, 2026",
    cases: [
      { id: "dc-1", input: "I was charged twice for my Pro subscription this month. I've emailed support 3 times with no response.", expected: '{"intent":"billing_dispute","priority":"high","action":"escalate_to_billing"}' },
      { id: "dc-2", input: "My card was declined when trying to upgrade to the Business plan.", expected: '{"intent":"payment_failure","priority":"medium","action":"resend_payment_link"}' },
      { id: "dc-3", input: "Can I get a prorated refund if I downgrade mid-cycle?", expected: '{"intent":"refund_request","priority":"low","action":"send_policy_doc"}' },
      { id: "dc-4", input: "I cancelled my account last week but was still charged for the next month.", expected: '{"intent":"billing_dispute","priority":"high","action":"escalate_to_billing"}' },
    ],
  },
  {
    id: "ds-technical",
    name: "Technical issues",
    description: "Bug reports and integration failures from chatbot and email channels.",
    updated: "Apr 14, 2026",
    cases: [
      { id: "dc-5", input: "The chatbot widget isn't loading on our website after the latest update.", expected: '{"intent":"bug_report","priority":"high","action":"escalate_to_engineering"}' },
      { id: "dc-6", input: "How do I reset my API key?", expected: "Go to Settings > API Keys > Regenerate. Note: your old key will be revoked immediately." },
      { id: "dc-7", input: "Email notifications stopped working after I changed my account email.", expected: '{"intent":"bug_report","priority":"medium","action":"escalate_to_engineering"}' },
    ],
  },
  {
    id: "ds-account",
    name: "Account & access",
    description: "Login issues, password resets, and seat management requests.",
    updated: "Apr 12, 2026",
    cases: [
      { id: "dc-8", input: "I can't log in — the password reset email never arrived. I've checked spam.", expected: '{"intent":"auth_issue","priority":"medium","action":"manual_reset"}' },
      { id: "dc-9", input: "Can I add two more team members to my current Business plan?", expected: '{"intent":"seat_management","priority":"low","action":"send_upgrade_info"}' },
    ],
  },
]

type AddCasesSource = "manual" | "csv" | "knowledge_base" | "run_logs"
type AddCasesSourceSelection = AddCasesSource | ""

function NewDatasetModal({ open, onOpenChange, onSave }: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSave: (ds: DatasetItem) => void
}) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [cases, setCases] = useState<DatasetCase[]>([{ id: "nd-1", input: "", expected: "" }])
  const [source, setSource] = useState<AddCasesSourceSelection>("")
  const [knowledgeBaseId, setKnowledgeBaseId] = useState("")
  const csvInputRef = useRef<HTMLInputElement>(null)

  useLayoutEffect(() => {
    if (!open) {
      setSource("")
      setKnowledgeBaseId("")
      return
    }
    setName("")
    setDescription("")
    setCases([{ id: "nd-1", input: "", expected: "" }])
    setSource("")
    setKnowledgeBaseId("")
  }, [open])

  function updateCaseRow(id: string, field: "input" | "expected", value: string) {
    setCases(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c))
  }
  function addCaseRow() {
    setCases(prev => [...prev, { id: `nd-${Date.now()}`, input: "", expected: "" }])
  }
  function removeCaseRow(id: string) {
    setCases(prev => prev.filter(c => c.id !== id))
  }

  function handleSave() {
    const datasetId = `ds-${Date.now()}`
    const filled = cases
      .filter(c => c.input.trim())
      .map((c, i) => ({ ...c, id: `dc-${datasetId}-${i}` }))
    onSave({
      id: datasetId,
      name: name.trim() || "Untitled dataset",
      description: description.trim(),
      cases: filled,
      updated: "Apr 22, 2026",
    })
    onOpenChange(false)
  }

  function parseSimpleCsv(text: string): DatasetCase[] {
    const lines = text.trim().split(/\r?\n/).filter(l => l.trim().length > 0)
    if (lines.length === 0) return []
    let start = 0
    const first = lines[0].toLowerCase()
    if (first.includes("input") && first.includes("expected")) start = 1
    const out: DatasetCase[] = []
    for (let i = start; i < lines.length; i++) {
      const line = lines[i]
      const comma = line.indexOf(",")
      if (comma === -1) {
        const t = line.trim()
        if (t) out.push({ id: `nd-csv-${i}`, input: t, expected: "" })
        continue
      }
      const input = line.slice(0, comma).trim().replace(/^"|"$/g, "")
      const expected = line.slice(comma + 1).trim().replace(/^"|"$/g, "")
      if (!input && !expected) continue
      out.push({ id: `nd-csv-${i}`, input, expected })
    }
    return out
  }

  async function handleCsvFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    const text = await file.text()
    const parsed = parseSimpleCsv(text)
    if (parsed.length === 0) {
      toast.error("No rows found", { description: "Use two columns: input, expected (comma-separated)." })
      return
    }
    setCases(parsed)
    setSource("manual")
    toast.success("Imported from CSV", { description: `${parsed.length} row${parsed.length !== 1 ? "s" : ""} loaded. Review and save.` })
  }

  function importFromKnowledgeBase() {
    if (!knowledgeBaseId) {
      toast.message("Pick a knowledge base first")
      return
    }
    const samples: Record<string, Omit<DatasetCase, "id">[]> = {
      support: [
        { input: "How do I reset my password?", expected: "Open Settings → Security → Reset password and follow the email link." },
        { input: "Where is my invoice?", expected: "Billing → Invoices lists PDFs for the last 12 months." },
      ],
      product: [
        { input: "What APIs are rate limited?", expected: "Search and embeddings are limited to 60 RPM on the free tier." },
        { input: "Supported file types for upload?", expected: "PDF, DOCX, TXT, and CSV up to 25 MB per file." },
      ],
      internal: [
        { input: "On-call escalation path", expected: "P1 → #incidents Slack → page infra-oncall; include customer impact." },
      ],
    }
    const base = samples[knowledgeBaseId] ?? samples.support
    const ts = Date.now()
    const rows: DatasetCase[] = base.map((row, i) => ({ ...row, id: `nd-kb-${ts}-${i}` }))
    setCases(rows)
    setSource("manual")
    toast.success("Imported from knowledge base", { description: `${rows.length} suggested row${rows.length !== 1 ? "s" : ""} — edit if needed, then save.` })
  }

  function importFromRunLogs() {
    const ts = Date.now()
    const rows: DatasetCase[] = [
      { id: `nd-rl-${ts}-0`, input: "[Run 4f2a · Agent] User: Can you summarize the last thread?", expected: "Here is a concise summary of the conversation: the user asked about billing, then API limits." },
      { id: `nd-rl-${ts}-1`, input: "[Run 4f2a · Tool: search_docs] query: rate limits free tier", expected: '{"hits":3,"top":"Search and embeddings: 60 RPM on free tier."}' },
      { id: `nd-rl-${ts}-2`, input: "[Run 9c11 · Agent] User: Draft a polite decline for out-of-scope legal advice", expected: "I cannot provide legal advice. I can share our policy docs or connect you with the legal team if you tell me your region." },
    ]
    setCases(rows)
    setSource("manual")
    toast.success("Imported from run logs", { description: `${rows.length} row${rows.length !== 1 ? "s" : ""} from recent runs — edit if needed, then save.` })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col gap-0 p-0 overflow-hidden h-full max-h-[100dvh]">
        <SheetHeader className="px-6 pt-2 pb-4 border-b border-border/60 space-y-1 text-left shrink-0">
          <SheetTitle>New dataset</SheetTitle>
          <SheetDescription>
            Give it a name and description. Optionally add test cases below, or use &quot;Add test cases&quot; on the dataset later.
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4 min-h-0">
          <div className="space-y-1.5">
            <Label htmlFor="ds-name">Name</Label>
            <Input id="ds-name" placeholder="e.g. Billing disputes" value={name} onChange={e => setName(e.target.value)} className="h-9" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ds-desc">Description <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Input id="ds-desc" placeholder="Short description of this dataset" value={description} onChange={e => setDescription(e.target.value)} className="h-9" />
          </div>
          <div className="space-y-4 pt-1">
            <Label>Test cases <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Select value={source === "" ? undefined : source} onValueChange={v => setSource(v as AddCasesSource)}>
              <SelectTrigger id="new-ds-cases-source" className="w-full h-9" aria-label="How to add test cases">
                <SelectValue placeholder="Select a way to add test cases" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manual entry</SelectItem>
                <SelectItem value="csv">Upload CSV document</SelectItem>
                <SelectItem value="knowledge_base">Knowledge base</SelectItem>
                <SelectItem value="run_logs">From Run logs</SelectItem>
              </SelectContent>
            </Select>

            {source === "manual" && (
              <div className="rounded-lg border border-border/80 overflow-hidden">
                <div className="grid grid-cols-[1fr_1fr_1.5rem] gap-3 px-3 py-2 bg-muted/30 border-b border-border/70 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  <span>Input</span><span>Expected output</span><span />
                </div>
                <div className="divide-y divide-border/60">
                  {cases.map((c, i) => (
                    <div key={c.id} className="grid grid-cols-[1fr_1fr_1.5rem] gap-3 px-3 py-2.5 items-start">
                      <Textarea placeholder={`Input ${i + 1}...`} value={c.input} onChange={e => updateCaseRow(c.id, "input", e.target.value)} rows={2} className="text-xs resize-none min-h-[56px]" />
                      <Textarea placeholder="Expected output..." value={c.expected} onChange={e => updateCaseRow(c.id, "expected", e.target.value)} rows={2} className="text-xs resize-none min-h-[56px]" />
                      <button type="button" onClick={() => removeCaseRow(c.id)} disabled={cases.length === 1} className="mt-1 flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={addCaseRow} className="flex w-full items-center gap-2 px-3 py-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/40 border-t border-border/60 transition-colors">
                  <Plus className="h-3.5 w-3.5" /> Add another row
                </button>
              </div>
            )}

            {source === "csv" && (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  First column is treated as input, second as expected output. Optional header row: <span className="font-mono text-[11px]">input, expected</span>
                </p>
                <input ref={csvInputRef} type="file" accept=".csv,text/csv" className="sr-only" onChange={handleCsvFile} />
                <button
                  type="button"
                  onClick={() => csvInputRef.current?.click()}
                  className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border/80 bg-muted/20 px-6 py-10 text-center transition-colors hover:bg-muted/35 hover:border-border"
                >
                  <CloudUpload className="h-8 w-8 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">Upload CSV</span>
                  <span className="text-xs text-muted-foreground">Click to choose a file from your computer</span>
                </button>
              </div>
            )}

            {source === "knowledge_base" && (
              <div className="space-y-4">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Pull suggested question–answer pairs from a connected knowledge base (prototype: sample rows per base).
                </p>
                <div className="space-y-2">
                  <Label htmlFor="new-ds-cases-kb">Knowledge base</Label>
                  <Select value={knowledgeBaseId || undefined} onValueChange={setKnowledgeBaseId}>
                    <SelectTrigger id="new-ds-cases-kb" className="w-full h-9">
                      <SelectValue placeholder="Select a knowledge base" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="support">Support documentation</SelectItem>
                      <SelectItem value="product">Product FAQs</SelectItem>
                      <SelectItem value="internal">Internal wiki</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="button" variant="secondary" className="w-full gap-2" onClick={importFromKnowledgeBase}>
                  <Database className="h-3.5 w-3.5" />
                  Import suggested cases
                </Button>
              </div>
            )}

            {source === "run_logs" && (
              <div className="space-y-4">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Turn recent workflow run traces into test rows: each row uses the logged prompt or user turn as input and the model or tool output as expected (prototype: sample rows).
                </p>
                <Button type="button" variant="secondary" className="w-full gap-2" onClick={importFromRunLogs}>
                  <History className="h-3.5 w-3.5" />
                  Import from run logs
                </Button>
              </div>
            )}
          </div>
        </div>
        <SheetFooter className="shrink-0 px-6 py-4 border-t border-border/60 bg-muted/10 gap-2 sm:flex-row sm:justify-end sm:space-x-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={!name.trim()}>Save dataset</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

function AddCasesModal({ open, onOpenChange, dataset, onSave }: {
  open: boolean
  onOpenChange: (v: boolean) => void
  dataset: DatasetItem | null
  onSave: (datasetId: string, newCases: DatasetCase[]) => void
}) {
  const [cases, setCases] = useState<DatasetCase[]>([{ id: "ac-1", input: "", expected: "" }])
  const [source, setSource] = useState<AddCasesSourceSelection>("")
  const [knowledgeBaseId, setKnowledgeBaseId] = useState<string>("")
  const csvInputRef = useRef<HTMLInputElement>(null)

  useLayoutEffect(() => {
    if (!open) {
      setSource("")
      setKnowledgeBaseId("")
      return
    }
    setCases([{ id: "ac-1", input: "", expected: "" }])
    setSource("")
    setKnowledgeBaseId("")
  }, [open])

  function updateCase(id: string, field: "input" | "expected", value: string) {
    setCases(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c))
  }
  function addCase() {
    setCases(prev => [...prev, { id: `ac-${Date.now()}`, input: "", expected: "" }])
  }
  function removeCase(id: string) {
    setCases(prev => prev.filter(c => c.id !== id))
  }
  function handleSave() {
    const filled = cases.filter(c => c.input.trim())
    if (!dataset || filled.length === 0) return
    onSave(dataset.id, filled)
    onOpenChange(false)
  }

  function parseSimpleCsv(text: string): DatasetCase[] {
    const lines = text.trim().split(/\r?\n/).filter(l => l.trim().length > 0)
    if (lines.length === 0) return []
    let start = 0
    const first = lines[0].toLowerCase()
    if (first.includes("input") && first.includes("expected")) start = 1
    const out: DatasetCase[] = []
    for (let i = start; i < lines.length; i++) {
      const line = lines[i]
      const comma = line.indexOf(",")
      if (comma === -1) {
        const t = line.trim()
        if (t) out.push({ id: `ac-csv-${i}`, input: t, expected: "" })
        continue
      }
      const input = line.slice(0, comma).trim().replace(/^"|"$/g, "")
      const expected = line.slice(comma + 1).trim().replace(/^"|"$/g, "")
      if (!input && !expected) continue
      out.push({ id: `ac-csv-${i}`, input, expected })
    }
    return out
  }

  async function handleCsvFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    const text = await file.text()
    const parsed = parseSimpleCsv(text)
    if (parsed.length === 0) {
      toast.error("No rows found", { description: "Use two columns: input, expected (comma-separated)." })
      return
    }
    setCases(parsed)
    setSource("manual")
    toast.success("Imported from CSV", { description: `${parsed.length} row${parsed.length !== 1 ? "s" : ""} loaded. Review and save.` })
  }

  function importFromKnowledgeBase() {
    if (!knowledgeBaseId) {
      toast.message("Pick a knowledge base first")
      return
    }
    const samples: Record<string, Omit<DatasetCase, "id">[]> = {
      support: [
        { input: "How do I reset my password?", expected: "Open Settings → Security → Reset password and follow the email link." },
        { input: "Where is my invoice?", expected: "Billing → Invoices lists PDFs for the last 12 months." },
      ],
      product: [
        { input: "What APIs are rate limited?", expected: "Search and embeddings are limited to 60 RPM on the free tier." },
        { input: "Supported file types for upload?", expected: "PDF, DOCX, TXT, and CSV up to 25 MB per file." },
      ],
      internal: [
        { input: "On-call escalation path", expected: "P1 → #incidents Slack → page infra-oncall; include customer impact." },
      ],
    }
    const base = samples[knowledgeBaseId] ?? samples.support
    const ts = Date.now()
    const rows: DatasetCase[] = base.map((row, i) => ({ ...row, id: `ac-kb-${ts}-${i}` }))
    setCases(rows)
    setSource("manual")
    toast.success("Imported from knowledge base", { description: `${rows.length} suggested row${rows.length !== 1 ? "s" : ""} — edit if needed, then save.` })
  }

  function importFromRunLogs() {
    const ts = Date.now()
    const rows: DatasetCase[] = [
      { id: `ac-rl-${ts}-0`, input: "[Run 4f2a · Agent] User: Can you summarize the last thread?", expected: "Here is a concise summary of the conversation: the user asked about billing, then API limits." },
      { id: `ac-rl-${ts}-1`, input: "[Run 4f2a · Tool: search_docs] query: rate limits free tier", expected: '{"hits":3,"top":"Search and embeddings: 60 RPM on free tier."}' },
      { id: `ac-rl-${ts}-2`, input: "[Run 9c11 · Agent] User: Draft a polite decline for out-of-scope legal advice", expected: "I cannot provide legal advice. I can share our policy docs or connect you with the legal team if you tell me your region." },
    ]
    setCases(rows)
    setSource("manual")
    toast.success("Imported from run logs", { description: `${rows.length} row${rows.length !== 1 ? "s" : ""} from recent runs — edit if needed, then save.` })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col gap-0 p-0 overflow-hidden">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border/60 space-y-1 text-left shrink-0">
          <SheetTitle>Add test cases</SheetTitle>
          <SheetDescription>
            Adding to <span className="font-medium text-foreground">{dataset?.name}</span> — {dataset?.cases.length ?? 0} existing row{(dataset?.cases.length ?? 0) !== 1 ? "s" : ""}
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">
          <div className="space-y-2">
            <Label htmlFor="add-cases-source">Add cases from</Label>
            <Select value={source === "" ? undefined : source} onValueChange={v => setSource(v as AddCasesSource)}>
              <SelectTrigger id="add-cases-source" className="w-full h-9">
                <SelectValue placeholder="Select a way to add test cases" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manual entry</SelectItem>
                <SelectItem value="csv">Upload CSV document</SelectItem>
                <SelectItem value="knowledge_base">Knowledge base</SelectItem>
                <SelectItem value="run_logs">From Run logs</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {source === "manual" && (
            <div className="rounded-lg border border-border/80 overflow-hidden">
              <div className="grid grid-cols-[1fr_1fr_1.5rem] gap-3 px-3 py-2 bg-muted/30 border-b border-border/70 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                <span>Input</span><span>Expected output</span><span />
              </div>
              <div className="divide-y divide-border/60">
                {cases.map((c, i) => (
                  <div key={c.id} className="grid grid-cols-[1fr_1fr_1.5rem] gap-3 px-3 py-2.5 items-start">
                    <Textarea placeholder={`Input ${i + 1}...`} value={c.input} onChange={e => updateCase(c.id, "input", e.target.value)} rows={2} className="text-xs resize-none min-h-[56px]" />
                    <Textarea placeholder="Expected output..." value={c.expected} onChange={e => updateCase(c.id, "expected", e.target.value)} rows={2} className="text-xs resize-none min-h-[56px]" />
                    <button type="button" onClick={() => removeCase(c.id)} disabled={cases.length === 1} className="mt-1 flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <button type="button" onClick={addCase} className="flex w-full items-center gap-2 px-3 py-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/40 border-t border-border/60 transition-colors">
                <Plus className="h-3.5 w-3.5" /> Add another row
              </button>
            </div>
          )}

          {source === "csv" && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground leading-relaxed">
                First column is treated as input, second as expected output. Optional header row: <span className="font-mono text-[11px]">input, expected</span>
              </p>
              <input ref={csvInputRef} type="file" accept=".csv,text/csv" className="sr-only" onChange={handleCsvFile} />
              <button
                type="button"
                onClick={() => csvInputRef.current?.click()}
                className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border/80 bg-muted/20 px-6 py-10 text-center transition-colors hover:bg-muted/35 hover:border-border"
              >
                <CloudUpload className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Upload CSV</span>
                <span className="text-xs text-muted-foreground">Click to choose a file from your computer</span>
              </button>
            </div>
          )}

          {source === "knowledge_base" && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Pull suggested question–answer pairs from a connected knowledge base (prototype: sample rows per base).
              </p>
              <div className="space-y-2">
                <Label htmlFor="add-cases-kb">Knowledge base</Label>
                <Select value={knowledgeBaseId || undefined} onValueChange={setKnowledgeBaseId}>
                  <SelectTrigger id="add-cases-kb" className="w-full h-9">
                    <SelectValue placeholder="Select a knowledge base" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="support">Support documentation</SelectItem>
                    <SelectItem value="product">Product FAQs</SelectItem>
                    <SelectItem value="internal">Internal wiki</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="button" variant="secondary" className="w-full gap-2" onClick={importFromKnowledgeBase}>
                <Database className="h-3.5 w-3.5" />
                Import suggested cases
              </Button>
            </div>
          )}

          {source === "run_logs" && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Turn recent workflow run traces into test rows: each row uses the logged prompt or user turn as input and the model or tool output as expected (prototype: sample rows).
              </p>
              <Button type="button" variant="secondary" className="w-full gap-2" onClick={importFromRunLogs}>
                <History className="h-3.5 w-3.5" />
                Import from run logs
              </Button>
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-border/60 bg-muted/10 flex items-center justify-end gap-2 shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={cases.every(c => !c.input.trim())}>Save test cases</Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function DatasetTab({
  openDatasetName = null,
  onOpenDatasetHandled,
}: {
  openDatasetName?: string | null
  onOpenDatasetHandled?: () => void
} = {}) {
  const [datasets, setDatasets] = useState<DatasetItem[]>(INITIAL_DATASET_ITEMS)
  const [openDatasetId, setOpenDatasetId] = useState<string | null>(null)
  const [newDatasetOpen, setNewDatasetOpen] = useState(false)
  const [addCasesOpen, setAddCasesOpen] = useState(false)

  const openDataset = datasets.find(d => d.id === openDatasetId) ?? null

  useEffect(() => {
    if (!openDatasetName) return
    const match = datasets.find((d) => d.name.toLowerCase() === openDatasetName.toLowerCase())
    if (match) {
      setOpenDatasetId(match.id)
    } else {
      toast.message("Dataset not found", {
        description: `Could not find "${openDatasetName}" in Evaluator datasets.`,
      })
    }
    onOpenDatasetHandled?.()
  }, [datasets, onOpenDatasetHandled, openDatasetName])

  function handleNewDataset(ds: DatasetItem) {
    setDatasets(prev => [ds, ...prev])
    toast.success("Dataset created", { description: `"${ds.name}" saved with ${ds.cases.length} test case${ds.cases.length !== 1 ? "s" : ""}.` })
  }

  function handleAddCases(datasetId: string, newCases: DatasetCase[]) {
    setDatasets(prev => prev.map(ds => ds.id === datasetId ? { ...ds, cases: [...ds.cases, ...newCases], updated: "Apr 22, 2026" } : ds))
    toast.success("Test cases added", { description: `${newCases.length} row${newCases.length !== 1 ? "s" : ""} added.` })
  }

  function deleteDataset(id: string) {
    setDatasets(prev => prev.filter(ds => ds.id !== id))
    toast.success("Dataset deleted")
  }

  function deleteCase(datasetId: string, caseId: string) {
    setDatasets(prev => prev.map(ds => ds.id === datasetId ? { ...ds, cases: ds.cases.filter(c => c.id !== caseId) } : ds))
  }

  // ── Detail view ──────────────────────────────────────────────────────────────
  if (openDataset) {
    return (
      <div className="flex flex-col h-full">
        {/* Subpage header */}
        <div className="flex items-center gap-2 px-6 py-4 border-b border-border/60">
          <button
            type="button"
            onClick={() => setOpenDatasetId(null)}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronRight className="h-4 w-4 rotate-180" />
            Datasets
          </button>
          <span className="text-muted-foreground/50">/</span>
          <span className="text-sm font-semibold text-foreground">{openDataset.name}</span>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{openDataset.cases.length} row{openDataset.cases.length !== 1 ? "s" : ""}</span>
            <Button size="sm" className="h-8 gap-1.5" onClick={() => setAddCasesOpen(true)}>
              <Plus className="h-3.5 w-3.5" /> Add test cases
            </Button>
          </div>
        </div>

        {/* Cases table */}
        <div className="flex-1 overflow-auto p-6">
          <div className="overflow-x-auto rounded-lg border border-border/80 bg-background shadow-sm">
            {/* Header */}
            <div className="grid grid-cols-[2rem_2fr_3fr_2rem] min-w-[560px] gap-6 px-4 py-2.5 border-b border-border/70 bg-muted/30 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              <span>#</span>
              <span>Input</span>
              <span>Expected output</span>
              <span />
            </div>
            {/* Rows */}
            <div className="min-w-[560px] divide-y divide-border/70">
              {openDataset.cases.length === 0 && (
                <div className="flex flex-col items-center justify-center py-14 gap-2 text-center">
                  <p className="text-sm text-muted-foreground">No test cases yet.</p>
                  <button type="button" className="text-xs underline text-muted-foreground hover:text-foreground" onClick={() => setAddCasesOpen(true)}>
                    Add the first one
                  </button>
                </div>
              )}
              {openDataset.cases.map((c, i) => (
                <div key={c.id} className="group/row grid grid-cols-[2rem_2fr_3fr_2rem] gap-6 px-4 py-4 items-start hover:bg-muted/40 transition-colors">
                  <span className="text-xs text-muted-foreground tabular-nums pt-0.5">{i + 1}</span>
                  <p className="text-[13px] text-foreground leading-relaxed line-clamp-3">{c.input}</p>
                  <p className="text-[13px] text-muted-foreground leading-relaxed line-clamp-3">{c.expected}</p>
                  <button
                    type="button"
                    onClick={() => deleteCase(openDataset.id, c.id)}
                    className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground opacity-0 group-hover/row:opacity-100 hover:text-destructive hover:bg-destructive/10 transition-all"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <AddCasesModal open={addCasesOpen} onOpenChange={setAddCasesOpen} dataset={openDataset} onSave={handleAddCases} />
      </div>
    )
  }

  // ── List view ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full p-6 gap-4">
      <ManusTipBanner>
        <p>
          <span className="font-medium text-foreground">Datasets</span> are sets of test cases that will let you evaluate
          workflow changes (Experiments Tab). You can add manual test cases to a dataset, or import from existing runs or
          files.
        </p>
      </ManusTipBanner>
      <div className="flex justify-end">
        <Button variant="outline" size="sm" className="h-8 shrink-0 gap-1.5" onClick={() => setNewDatasetOpen(true)}>
          <Plus className="h-3.5 w-3.5" /> New dataset
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border/80 bg-background shadow-sm">
        {/* Table header */}
        <div className="grid grid-cols-[2fr_1fr_2fr_1fr_2rem] min-w-[640px] gap-4 px-4 py-2.5 border-b border-border/70 bg-muted/30 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          <span>Dataset</span>
          <span>Test cases</span>
          <span>Description</span>
          <span className="text-right">Updated</span>
          <span />
        </div>

        {/* Rows */}
        <div className="min-w-[640px] divide-y divide-border/70">
          {datasets.length === 0 && (
            <div className="flex flex-col items-center justify-center py-14 gap-2 text-center">
              <Database className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm font-medium text-muted-foreground">No datasets yet</p>
              <p className="text-xs text-muted-foreground/70">Create one to start adding test cases</p>
            </div>
          )}
          {datasets.map((ds) => (
            <div
              key={ds.id}
              className="group grid grid-cols-[2fr_1fr_2fr_1fr_2rem] gap-4 px-4 py-4 items-center hover:bg-muted/40 cursor-pointer transition-colors"
              onClick={() => setOpenDatasetId(ds.id)}
            >
              {/* Name */}
              <div className="min-w-0 flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground truncate">{ds.name}</span>
                  {ds.badge && <Badge variant="secondary" className="text-xs shrink-0">{ds.badge}</Badge>}
                </div>
              </div>

              {/* Case count */}
              <div className="text-[13px] text-muted-foreground tabular-nums">
                {ds.cases.length} row{ds.cases.length !== 1 ? "s" : ""}
              </div>

              {/* Description */}
              <p className="text-[13px] text-muted-foreground leading-snug line-clamp-2">{ds.description}</p>

              {/* Updated */}
              <div className="text-right">
                <span className="text-[13px] font-medium text-foreground">{ds.updated}</span>
              </div>

              {/* Actions */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    onClick={e => e.stopPropagation()}
                    className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-muted transition-opacity"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem className="gap-2" onClick={e => { e.stopPropagation(); setOpenDatasetId(ds.id); }}>
                    <Pencil className="h-3.5 w-3.5 opacity-70" /> Open dataset
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-2 text-destructive focus:text-destructive" onClick={e => { e.stopPropagation(); deleteDataset(ds.id); }}>
                    <Trash2 className="h-3.5 w-3.5 opacity-70" /> Delete dataset
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      </div>

      <NewDatasetModal open={newDatasetOpen} onOpenChange={setNewDatasetOpen} onSave={handleNewDataset} />
    </div>
  )
}

// ─── Signals Tab ───────────────────────────────────────────────────────────────

type SignalDetectionType = "llm-judge" | "regex" | "code" | "semantic"

type SignalCategoryId =
  | "failure"
  | "logic"
  | "task"
  | "friction"
  | "safety"
  | "hallucination"
  | "intent"
  | "custom"

/** `"full-trace"` or a `GANTT_NODES` id — where the signal runs in the workflow. */
type SignalScopeValue = "full-trace" | (typeof GANTT_NODES)[number]["id"]

type SignalListItem = {
  id: string
  name: string
  detectionType: SignalDetectionType
  category?: SignalCategoryId
  /** If set, this signal is driven by an evaluator's score rather than standalone detection logic. */
  linkedEvaluatorId?: number
  linkedEvaluatorName?: string
  description: string
  lastFired?: string
  updated: string
  badge?: string
  enabled: boolean
  alertsEnabled: boolean
  /** Defaults to full trace when unset. */
  scope?: SignalScopeValue
}

const SIGNAL_DETECTION_TYPES: {
  id: SignalDetectionType
  label: string
  icon: React.ReactNode
  description: string
}[] = [
  {
    id: "llm-judge",
    label: "LLM Judge",
    icon: <MessageSquare className="h-4 w-4" />,
    description: "Write a prompt — an LLM scores every trace",
  },
  {
    id: "regex",
    label: "Regex / Keyword",
    icon: <TextCursorInput className="h-4 w-4" />,
    description: "Match a pattern against trace output or fields",
  },
  {
    id: "code",
    label: "Code",
    icon: <Calculator className="h-4 w-4" />,
    description: "Python snippet that returns a score or bool",
  },
  {
    id: "semantic",
    label: "Semantic Similarity",
    icon: <Target className="h-4 w-4" />,
    description: "Embedding distance vs. a reference string",
  },
]

const SIGNAL_CATEGORIES: {
  id: SignalCategoryId
  label: string
  icon: React.ReactNode
  placeholder: string
}[] = [
  {
    id: "failure",
    label: "Failure",
    icon: <AlertCircle className="h-4 w-4" />,
    placeholder: "Analyze this trace for failures, errors, or things that went wrong. Return PASS if no issues found, FAIL with a brief explanation otherwise.",
  },
  {
    id: "hallucination",
    label: "Hallucination",
    icon: <EyeOff className="h-4 w-4" />,
    placeholder: "Detect fabricated facts, unsupported claims, or contradictions with the provided context. Return PASS if output is grounded, FAIL with specifics otherwise.",
  },
  {
    id: "safety",
    label: "Safety",
    icon: <Shield className="h-4 w-4" />,
    placeholder: "Flag unsafe content, policy violations, or risky recommendations. Return PASS if output is safe, FAIL with the offending section otherwise.",
  },
  {
    id: "task",
    label: "Task completion",
    icon: <CheckCircle2 className="h-4 w-4" />,
    placeholder: "Check whether the agent completed the user’s stated task end-to-end. Return a score from 0 to 1 reflecting completeness.",
  },
  {
    id: "logic",
    label: "Logic",
    icon: <Calculator className="h-4 w-4" />,
    placeholder: "Identify logical inconsistencies, invalid reasoning steps, or broken assumptions. Return PASS if reasoning is sound, FAIL with the flaw otherwise.",
  },
  {
    id: "friction",
    label: "User friction",
    icon: <Frown className="h-4 w-4" />,
    placeholder: "Spot confusing replies, unnecessary retries, or signals of user frustration. Return PASS if experience is smooth, FAIL with context otherwise.",
  },
  {
    id: "intent",
    label: "Intent match",
    icon: <Target className="h-4 w-4" />,
    placeholder: "Assess whether the response matches the user’s stated intent and addresses their actual need. Return a score from 0 to 1.",
  },
  {
    id: "custom",
    label: "Custom",
    icon: <Plus className="h-4 w-4" />,
    placeholder: "Describe what you’re looking for in the trace…",
  },
]

const INITIAL_SIGNAL_ITEMS: SignalListItem[] = [
  {
    id: "sig-failure",
    name: "Failure detector",
    detectionType: "llm-judge",
    category: "failure",
    linkedEvaluatorId: 3,
    linkedEvaluatorName: "Resolution completeness",
    description: "Fires when Resolution completeness drops below threshold — flags runs where the reply failed to resolve the issue.",
    lastFired: "2 hrs ago",
    updated: "Apr 16, 2026",
    enabled: true,
    alertsEnabled: true,
    scope: "full-trace",
  },
  {
    id: "sig-hallucination",
    name: "Hallucination check",
    detectionType: "llm-judge",
    category: "hallucination",
    description: "Detect fabricated facts, unsupported claims, or contradictions with provided context. Return PASS if output is grounded, FAIL with specifics otherwise.",
    lastFired: "Yesterday",
    updated: "Apr 17, 2026",
    enabled: true,
    alertsEnabled: false,
    scope: "4",
  },
  {
    id: "sig-escalation",
    name: "Escalation keyword",
    detectionType: "regex",
    category: "task",
    description: "Matches output against /(escalat|supervisor|manager)/i — flags runs where human handoff was triggered.",
    lastFired: "Apr 14, 2026",
    updated: "Apr 14, 2026",
    enabled: true,
    alertsEnabled: true,
    scope: "6",
  },
  {
    id: "sig-tone",
    name: "Low empathy",
    detectionType: "llm-judge",
    category: "friction",
    linkedEvaluatorId: 2,
    linkedEvaluatorName: "Tone & empathy",
    description: "Fires when Tone & empathy score drops below threshold — surfaces replies that lack acknowledgment on high-priority tickets.",
    updated: "Apr 10, 2026",
    enabled: false,
    alertsEnabled: false,
    scope: "full-trace",
  },
]

function categoryLabel(cat?: SignalCategoryId): string {
  return SIGNAL_CATEGORIES.find((c) => c.id === cat)?.label ?? "—"
}

function categoryMeta(cat?: SignalCategoryId) {
  return SIGNAL_CATEGORIES.find((c) => c.id === cat)
}

function signalScopeLabel(scope: SignalScopeValue | undefined): string {
  if (scope == null || scope === "full-trace") return "Full workflow"
  return GANTT_NODES.find((n) => n.id === scope)?.label ?? scope
}

function SignalScopeCell({ scope }: { scope: SignalScopeValue | undefined }) {
  const label = signalScopeLabel(scope)
  const fullWorkflow = scope == null || scope === "full-trace"
  const node = fullWorkflow ? undefined : GANTT_NODES.find((n) => n.id === scope)
  return (
    <div className="flex min-w-0 items-center gap-1.5" title={label}>
      <span className="shrink-0 text-muted-foreground [&_svg]:h-3.5 [&_svg]:w-3.5" aria-hidden>
        {fullWorkflow ? (
          <Workflow className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <GanttNodeIcon type={node?.icon} />
        )}
      </span>
      <span className="text-[13px] text-muted-foreground truncate">{label}</span>
    </div>
  )
}

function CreateSignalSheet({
  open,
  onOpenChange,
  onCreate,
  editingSignal,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (item: Omit<SignalListItem, "id" | "updated" | "lastFired">) => void
  editingSignal: SignalListItem | null
}) {
  const [category, setCategory] = useState<SignalCategoryId | null>(null)
  const [name, setName] = useState("")
  const [prompt, setPrompt] = useState("")
  const [alertsEnabled, setAlertsEnabled] = useState(false)
  const [scope, setScope] = useState<SignalScopeValue>("full-trace")
  const [historicalRunMode, setHistoricalRunMode] = useState<"all" | "specific">("all")
  const [historicalRunIds, setHistoricalRunIds] = useState<string[]>([])
  const [historicalRunning, setHistoricalRunning] = useState(false)
  const [historicalResults, setHistoricalResults] = useState<{ id: string; label: string; fired: boolean }[] | null>(null)

  const tpl =
    category != null
      ? (SIGNAL_CATEGORIES.find((c) => c.id === category) ?? SIGNAL_CATEGORIES[0])
      : null

  useEffect(() => {
    if (!open) return
    if (editingSignal) {
      setCategory(editingSignal.category ?? "failure")
      setName(editingSignal.name)
      setPrompt(editingSignal.description)
      setAlertsEnabled(editingSignal.alertsEnabled)
      const s = editingSignal.scope
      const validNode = s && s !== "full-trace" && GANTT_NODES.some((n) => n.id === s)
      setScope(validNode ? (s as SignalScopeValue) : "full-trace")
    } else {
      setCategory(null)
      setName("")
      setPrompt("")
      setAlertsEnabled(false)
      setScope("full-trace")
    }
  }, [open, editingSignal])

  const selectCategory = (id: SignalCategoryId) => {
    const cat = SIGNAL_CATEGORIES.find((c) => c.id === id) ?? SIGNAL_CATEGORIES[0]
    setCategory(id)
    setPrompt(cat.placeholder)
  }

  const handleCreate = () => {
    if (!editingSignal && category == null) return
    const t = tpl ?? SIGNAL_CATEGORIES[0]
    const common = {
      name: name.trim() || t.label,
      category: category ?? "failure",
      description: prompt.trim() || t.placeholder,
      alertsEnabled,
      scope,
    }
    if (editingSignal) {
      onCreate({
        detectionType: editingSignal.detectionType,
        enabled: editingSignal.enabled,
        linkedEvaluatorId: editingSignal.linkedEvaluatorId,
        linkedEvaluatorName: editingSignal.linkedEvaluatorName,
        badge: editingSignal.badge,
        ...common,
      })
    } else {
      onCreate({
        ...common,
        detectionType: "llm-judge",
        badge: undefined,
        enabled: true,
      })
    }
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-[min(100vw-1rem,440px)] max-h-[100vh] flex-col gap-0 border-border bg-background p-0 sm:max-w-[440px]"
      >
        <SheetHeader className="space-y-1 border-b border-border/60 px-6 pb-4 pt-6 text-left">
          <SheetTitle className="text-lg font-semibold tracking-tight">
            {editingSignal ? "Edit signal" : "Create new signal"}
          </SheetTitle>
          <p className="text-sm text-muted-foreground">
            {editingSignal
              ? "Update how this signal runs against traces."
              : "Start from a template, then describe what to extract from traces."}
          </p>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-6 py-5">

          {/* ── Signal type ── */}
          <section className="space-y-2">
            <Label htmlFor="signal-type">Signal type</Label>
            <Select
              value={category === null ? "" : category}
              onValueChange={(v) => selectCategory(v as SignalCategoryId)}
            >
              <SelectTrigger id="signal-type" className="h-9 w-full">
                <SelectValue placeholder="Select a Signal type" />
              </SelectTrigger>
              <SelectContent>
                {SIGNAL_CATEGORIES.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <span className="flex items-center gap-2">
                      <span className="shrink-0 text-muted-foreground [&_svg]:h-4 [&_svg]:w-4">{c.icon}</span>
                      {c.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </section>

          {/* ── Name ── */}
          <section className="space-y-2">
            <Label htmlFor="signal-name">Name</Label>
            <div className="relative">
              <Input
                id="signal-name"
                placeholder="Signal name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-9 pr-9"
              />
              <Lock className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            </div>
          </section>

          {(editingSignal != null || category != null) && (
            <>
              {/* ── Scope ── */}
              <section className="space-y-2">
                <Label htmlFor="signal-scope">Scope</Label>
                <p className="text-xs text-muted-foreground">
                  Run this signal on the full trace or restrict it to a single workflow step.
                </p>
                <Select value={scope} onValueChange={(v) => setScope(v as SignalScopeValue)}>
                  <SelectTrigger id="signal-scope" className="h-9 w-full">
                    <span className="flex min-w-0 flex-1 items-center gap-2">
                      <span className="shrink-0 text-muted-foreground [&_svg]:h-4 [&_svg]:w-4" aria-hidden>
                        {scope === "full-trace" ? (
                          <Workflow className="h-4 w-4" />
                        ) : (
                          <GanttNodeIcon type={GANTT_NODES.find((n) => n.id === scope)?.icon} />
                        )}
                      </span>
                      <SelectValue />
                    </span>
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectItem value="full-trace">
                      <span className="flex items-center gap-2">
                        <span className="shrink-0 text-muted-foreground [&_svg]:h-4 [&_svg]:w-4">
                          <Workflow className="h-4 w-4" />
                        </span>
                        Full workflow
                      </span>
                    </SelectItem>
                    {GANTT_NODES.map((node) => (
                      <SelectItem key={node.id} value={node.id}>
                        <span className="flex items-center gap-2">
                          <span className="shrink-0 text-muted-foreground [&_svg]:h-4 [&_svg]:w-4">
                            <GanttNodeIcon type={node.icon} />
                          </span>
                          <span className="truncate">{node.label}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </section>

              {/* ── Signal Prompt ── */}
              <section className="space-y-2">
                <Label htmlFor="signal-prompt">Signal Prompt</Label>
                <p className="text-xs text-muted-foreground">Describe what you&apos;re looking for in the trace.</p>
                <Textarea
                  id="signal-prompt"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={6}
                  className="min-h-[140px] resize-y"
                />
              </section>

              {/* ── Alerts ── */}
              <section className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 px-4 py-3">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">Alerts</p>
                  <p className="text-xs text-muted-foreground">Notify when this signal fires on a run.</p>
                </div>
                <Switch checked={alertsEnabled} onCheckedChange={setAlertsEnabled} />
              </section>

              {/* ── Test with historical runs ── */}
              <section className="space-y-3 rounded-lg border border-border/60 bg-muted/10 px-4 py-4">
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold">Test signal with historical runs</p>
                  <p className="text-xs text-muted-foreground">Run a retrospective analysis to see how this signal would have fired on past runs.</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Runs to test against</Label>
                  <Select value={historicalRunMode} onValueChange={(v) => { setHistoricalRunMode(v as "all" | "specific"); setHistoricalRunIds([]); setHistoricalResults(null) }}>
                    <SelectTrigger className="h-9 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All historical runs</SelectItem>
                      <SelectItem value="specific">Specific runs</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {historicalRunMode === "specific" && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Select runs</Label>
                    <div className="space-y-1.5 rounded-md border border-border/70 bg-background px-3 py-2">
                      {MOCK_LOGGED_RUNS.map((run) => (
                        <label key={run.id} className="flex cursor-pointer items-center gap-2.5 py-0.5">
                          <input
                            type="checkbox"
                            className="h-3.5 w-3.5 rounded accent-foreground"
                            checked={historicalRunIds.includes(run.id)}
                            onChange={(e) => {
                              setHistoricalRunIds((prev) =>
                                e.target.checked ? [...prev, run.id] : prev.filter((id) => id !== run.id)
                              )
                              setHistoricalResults(null)
                            }}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="text-xs font-medium text-foreground">{run.label}</span>
                            <span className="ml-1.5 text-[11px] text-muted-foreground">{run.meta}</span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {historicalResults && (
                  <div className="space-y-1.5 rounded-md border border-border/60 bg-background px-3 py-2.5">
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Results</p>
                    {historicalResults.map((r) => (
                      <div key={r.id} className="flex items-center justify-between gap-2">
                        <span className="text-xs text-foreground">{r.label}</span>
                        <span className={cn("text-[11px] font-medium", r.fired ? "text-amber-600" : "text-emerald-600")}>
                          {r.fired ? "Would fire" : "No match"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full gap-2"
                  disabled={historicalRunning || (historicalRunMode === "specific" && historicalRunIds.length === 0)}
                  onClick={() => {
                    setHistoricalRunning(true)
                    setHistoricalResults(null)
                    setTimeout(() => {
                      const runsToTest = historicalRunMode === "all"
                        ? MOCK_LOGGED_RUNS
                        : MOCK_LOGGED_RUNS.filter((r) => historicalRunIds.includes(r.id))
                      setHistoricalResults(runsToTest.map((r, i) => ({ id: r.id, label: r.label, fired: i % 2 === 0 })))
                      setHistoricalRunning(false)
                    }, 1400)
                  }}
                >
                  {historicalRunning ? (
                    <><Loader2 className="h-3.5 w-3.5 animate-spin" />Running…</>
                  ) : (
                    <><Play className="h-3.5 w-3.5" />Run retrospective</>
                  )}
                </Button>
              </section>
            </>
          )}

        </div>

        <SheetFooter className="flex flex-col gap-2 border-t border-border/60 bg-muted/10 px-6 py-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleCreate}
            disabled={!editingSignal && category == null}
          >
            {editingSignal ? "Save" : "Create"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

function SignalsTab({
  onOpenEvaluator,
}: {
  onOpenEvaluator: (evaluatorId: number) => void
}) {
  const [items, setItems] = useState<SignalListItem[]>(() => [...INITIAL_SIGNAL_ITEMS])
  const [createSignalOpen, setCreateSignalOpen] = useState(false)
  const [editingSignal, setEditingSignal] = useState<SignalListItem | null>(null)

  const toggleEnabled = (id: string) => {
    setItems((prev) => prev.map((s) => s.id === id ? { ...s, enabled: !s.enabled } : s))
  }

  const handleEdit = (sig: SignalListItem) => {
    if (sig.linkedEvaluatorId != null) {
      onOpenEvaluator(sig.linkedEvaluatorId)
    } else {
      setEditingSignal(sig)
    }
  }

  return (
    <div className="flex flex-col h-full p-6 gap-4">
      <CreateSignalSheet
        open={createSignalOpen || editingSignal !== null}
        editingSignal={editingSignal}
        onOpenChange={(open) => {
          if (!open) { setCreateSignalOpen(false); setEditingSignal(null) }
          else setCreateSignalOpen(true)
        }}
        onCreate={(payload) => {
          if (editingSignal) {
            setItems((prev) => prev.map((s) => s.id === editingSignal.id ? { ...s, ...payload } : s))
            toast.success("Signal updated", { description: `"${payload.name}" has been saved.` })
            setEditingSignal(null)
          } else {
            const id = `sig-${Date.now()}`
            const updated = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
            setItems((prev) => [{ id, updated, ...payload }, ...prev])
            toast.success("Signal created", { description: `"${payload.name}" is now active.` })
          }
        }}
      />

      <ManusTipBanner>
        <p>
          <span className="font-medium text-foreground">Signals</span> are monitored conditions that fire an alert when
          triggered. They run continuously in production. Useful to see if something broke.
        </p>
      </ManusTipBanner>

      <div className="flex justify-end">
        <Button variant="outline" size="sm" className="h-8 shrink-0" type="button" onClick={() => setCreateSignalOpen(true)}>
          <Plus className="h-3.5 w-3.5 shrink-0" aria-hidden />
          Create New Signal
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border/80 bg-background shadow-sm">
        <div
          className={cn(
            SIGNAL_TABLE_COL,
            "items-center min-w-[760px] px-4 py-2.5 border-b border-border/70 bg-muted/30 text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
          )}
        >
          <span>Signal</span>
          <span>Type</span>
          <span>Scope</span>
          <span>Last fired</span>
          <span>Status</span>
          <span className="sr-only">Actions</span>
        </div>

        <div className="min-w-[760px] divide-y divide-border/70">
          {items.map((sig) => (
            <div
              key={sig.id}
              className={cn(
                SIGNAL_TABLE_COL,
                "group px-4 py-3.5 min-h-[4rem] transition-colors hover:bg-muted/30"
              )}
            >
              {/* Linked: eval name; else signal name. */}
              <div className="min-w-0 flex flex-wrap items-center gap-1.5">
                {sig.linkedEvaluatorName ? (
                  sig.linkedEvaluatorId != null ? (
                    <button
                      type="button"
                      onClick={() => onOpenEvaluator(sig.linkedEvaluatorId!)}
                      className="w-fit min-w-0 max-w-full text-left text-sm font-semibold text-foreground truncate underline-offset-2 hover:text-foreground hover:underline"
                      title={sig.linkedEvaluatorName}
                    >
                      <span className="truncate">{sig.linkedEvaluatorName}</span>
                    </button>
                  ) : (
                    <span className="text-sm font-semibold text-foreground truncate" title={sig.linkedEvaluatorName}>
                      {sig.linkedEvaluatorName}
                    </span>
                  )
                ) : (
                  <span className="text-sm font-semibold text-foreground truncate">{sig.name}</span>
                )}
                {sig.badge ? (
                  <Badge variant="secondary" className="shrink-0 text-[10px] font-medium px-1.5 py-0">{sig.badge}</Badge>
                ) : null}
              </div>

              {/* Category */}
              <div className="min-w-0 flex flex-col gap-1 pt-0.5">
                {sig.linkedEvaluatorName ? (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); if (sig.linkedEvaluatorId != null) onOpenEvaluator(sig.linkedEvaluatorId) }}
                    className="w-fit flex items-center gap-1 rounded-md border border-border bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground hover:bg-muted/80"
                    title={`Linked evaluator: ${sig.linkedEvaluatorName}`}
                  >
                    <span className="truncate max-w-[10rem]">{sig.linkedEvaluatorName}</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5">
                    {sig.category ? (
                      <>
                        <span className="shrink-0 text-muted-foreground [&_svg]:h-3.5 [&_svg]:w-3.5" aria-hidden>
                          {categoryMeta(sig.category)?.icon}
                        </span>
                        <span className="text-[13px] text-muted-foreground truncate">{categoryLabel(sig.category)}</span>
                      </>
                    ) : (
                      <span className="text-[13px] text-muted-foreground/50">—</span>
                    )}
                  </div>
                )}
              </div>

              {/* Scope */}
              <div className="min-w-0 flex items-center pt-0.5">
                <SignalScopeCell scope={sig.scope} />
              </div>

              {/* Last fired */}
              <div className="min-w-0 flex items-center pt-0.5">
                <span className="text-[13px] text-muted-foreground tabular-nums">
                  {sig.lastFired ?? <span className="text-muted-foreground/50">Never</span>}
                </span>
              </div>

              {/* Enable toggle */}
              <div className="flex items-center pt-0.5">
                <Switch
                  checked={sig.enabled}
                  onCheckedChange={() => toggleEnabled(sig.id)}
                  aria-label={sig.enabled ? "Disable signal" : "Enable signal"}
                  className="scale-90"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end pt-0.5">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100 data-[state=open]:opacity-100"
                      aria-label="Signal actions"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem className="gap-2" onClick={() => handleEdit(sig)}>
                      <Pencil className="h-4 w-4 shrink-0 opacity-70" />
                      {sig.linkedEvaluatorId != null ? "Open evaluator" : "Edit signal"}
                    </DropdownMenuItem>
                    <DropdownMenuItem className="gap-2" onClick={() => toast.message("Run signal", { description: "Running signal against recent traces…" })}>
                      <Play className="h-4 w-4 shrink-0 opacity-70" />
                      Run now
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="gap-2 text-destructive focus:text-destructive"
                      onClick={() => setItems((prev) => prev.filter((s) => s.id !== sig.id))}
                    >
                      <Trash2 className="h-4 w-4 shrink-0 opacity-70" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Main Evaluator component ──────────────────────────────────────────────────

const INNER_TABS = ["Experiment", "Evals", "Signals", "Dataset"] as const
type InnerTab = (typeof INNER_TABS)[number]

export function Evaluator({
  /** Set from the layout when using Run progress → Evaluate / Compare; lives in the parent so it survives Evaluator remounts. */
  experimentSeedFromRun,
  /** Main app tab: switch to Workflow after confirming "convert variant to draft" in Experiment. */
  onNavigateToWorkflow,
  /** One-shot from layout when Workflow → Create variant; cleared after Experiment consumes it. */
  variantAppendToken = null,
  onVariantAppendConsumed,
  variantBuilderIntroToken = null,
  onVariantBuilderIntroConsumed,
  pendingOpenDatasetName = null,
  onPendingOpenDatasetConsumed,
}: {
  experimentSeedFromRun?: ExperimentRunSeed | null
  onNavigateToWorkflow?: () => void
  variantAppendToken?: string | null
  onVariantAppendConsumed?: () => void
  variantBuilderIntroToken?: string | null
  onVariantBuilderIntroConsumed?: () => void
  pendingOpenDatasetName?: string | null
  onPendingOpenDatasetConsumed?: () => void
} = {}) {
  const [activeTab, setActiveTab] = useState<InnerTab>("Experiment")
  const [datasetAutoOpenName, setDatasetAutoOpenName] = useState<string | null>(null)
  const [evaluators, setEvaluators] = useState<EvaluatorConfig[]>(INITIAL_EVALUATORS)
  const [evalDefs, setEvalDefs] = useState<EvaluatorDef[]>(INITIAL_EVALUATORS_DEF)
  const [selectedEvalIds, setSelectedEvalIds] = useState<string[]>([])
  const [createEvaluatorOpen, setCreateEvaluatorOpen] = useState(false)
  const [editingEvaluator, setEditingEvaluator] = useState<EvaluatorConfig | null>(null)

  useLayoutEffect(() => {
    if (!experimentSeedFromRun?.runId) return
    setSelectedEvalIds(evalDefs.map((e) => e.id))
    setActiveTab("Experiment")
  }, [experimentSeedFromRun, evalDefs])

  useLayoutEffect(() => {
    if (!variantBuilderIntroToken) return
    setActiveTab("Experiment")
  }, [variantBuilderIntroToken])

  useEffect(() => {
    if (!pendingOpenDatasetName) return
    setDatasetAutoOpenName(pendingOpenDatasetName)
    setActiveTab("Dataset")
    onPendingOpenDatasetConsumed?.()
  }, [onPendingOpenDatasetConsumed, pendingOpenDatasetName])

  useEffect(() => {
    setSelectedEvalIds((prev) => prev.filter((id) => evalDefs.some((e) => e.id === id)))
  }, [evalDefs])

  const createEvaluator = useCallback((row: Omit<EvaluatorConfig, "id" | "ran">) => {
    const evDefId = `ev-${Date.now()}`
    const defType: "score" | "reference" = row.type === "LLM judge" ? "score" : "reference"
    setEvaluators((prev) => {
      const nextId = Math.max(0, ...prev.map((e) => e.id)) + 1
      return [...prev, { ...row, id: nextId, ran: "0 runs" }]
    })
    setEvalDefs((prev) => [
      ...prev,
      { id: evDefId, label: row.name, type: defType, evaluationType: row.type, passThreshold: row.passThreshold },
    ])
    setSelectedEvalIds((prev) => (prev.includes(evDefId) ? prev : [...prev, evDefId]))
  }, [])

  const updateEvaluator = useCallback((id: number, row: Omit<EvaluatorConfig, "id" | "ran">) => {
    setEvaluators((prevEv) => {
      const idx = prevEv.findIndex((e) => e.id === id)
      if (idx === -1) return prevEv
      const defType: "score" | "reference" = row.type === "LLM judge" ? "score" : "reference"
      setEvalDefs((prevDef) => {
        if (idx >= prevDef.length) return prevDef
        const d = [...prevDef]
        d[idx] = { ...d[idx], label: row.name, type: defType, evaluationType: row.type, passThreshold: row.passThreshold }
        return d
      })
      const next = [...prevEv]
      next[idx] = { ...next[idx], ...row, id }
      return next
    })
  }, [])

  const deleteEvaluatorAt = useCallback((index: number) => {
    const removedId = evalDefs[index]?.id
    setEvaluators((prev) => prev.filter((_, i) => i !== index))
    setEvalDefs((prev) => prev.filter((_, i) => i !== index))
    if (removedId) {
      setSelectedEvalIds((ids) => ids.filter((id) => id !== removedId))
    }
  }, [evalDefs])

  const editEvaluator = useCallback((ev: EvaluatorConfig) => {
    setEditingEvaluator(ev)
    setCreateEvaluatorOpen(true)
  }, [])

  const createSignalFromEvaluator = useCallback((ev: EvaluatorConfig) => {
    toast.success("Signal created", {
      description: `"${ev.name}" is linked on the Signals tab. Adjust thresholds and notifications there.`,
    })
    setActiveTab("Signals")
  }, [])

  const testInExperimentAt = useCallback((rowIndex: number) => {
    const defId = evalDefs[rowIndex]?.id
    if (!defId) return
    setSelectedEvalIds((prev) => (prev.includes(defId) ? prev : [...prev, defId]))
    setActiveTab("Experiment")
  }, [evalDefs])

  return (
    <div className="flex flex-col h-full bg-[#f7f7f8]">
      <CreateEvaluatorDialog
        open={createEvaluatorOpen}
        onOpenChange={(open) => {
          setCreateEvaluatorOpen(open)
          if (!open) setEditingEvaluator(null)
        }}
        editingEvaluator={editingEvaluator}
        onSave={(row, editingId) => {
          if (editingId != null) {
            updateEvaluator(editingId, row)
            toast.success("Eval updated", {
              description: "Your changes are saved. Run it from the Experiment tab when you are ready.",
              action: {
                label: "Open Experiment",
                onClick: () => setActiveTab("Experiment"),
              },
              duration: 10_000,
            })
          } else {
            createEvaluator(row)
            toast.success("Eval created", {
              description:
                "It is saved and selected in Experiment. Open that tab when you are ready to run it on your table.",
              action: {
                label: "Open Experiment",
                onClick: () => setActiveTab("Experiment"),
              },
              duration: 12_000,
            })
          }
        }}
      />

      {/* Inner tab bar */}
      <div className="flex items-center px-6 pt-4">
        <div className="flex items-center gap-0.5 rounded-lg border border-border bg-muted p-1">
          {INNER_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-4 py-1.5 text-sm font-medium transition-all rounded-md",
                activeTab === tab
                  ? "bg-white text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "Experiment" && (
          <ExperimentTab
            key={
              experimentSeedFromRun
                ? `${experimentSeedFromRun.runId}-${experimentSeedFromRun.input.slice(0, 48)}-${experimentSeedFromRun.intentNonce ?? "default"}`
                : "default"
            }
            evalDefs={evalDefs}
            evaluators={evaluators}
            selectedEvalIds={selectedEvalIds}
            setSelectedEvalIds={setSelectedEvalIds}
            onOpenCreateEvaluator={() => {
              setEditingEvaluator(null)
              setCreateEvaluatorOpen(true)
            }}
            onNavigateToWorkflow={onNavigateToWorkflow}
            seedCase={experimentSeedFromRun ?? null}
            variantAppendToken={variantAppendToken}
            onVariantAppendConsumed={onVariantAppendConsumed}
            variantBuilderIntroToken={variantBuilderIntroToken}
            onVariantBuilderIntroConsumed={onVariantBuilderIntroConsumed}
          />
        )}
        {activeTab === "Evals" && (
          <EvaluatorsTab
            evaluators={evaluators}
            onOpenCreateEvaluator={() => {
              setEditingEvaluator(null)
              setCreateEvaluatorOpen(true)
            }}
            onEditEvaluator={editEvaluator}
            onDeleteEvaluator={deleteEvaluatorAt}
            onCreateSignalFromEvaluator={createSignalFromEvaluator}
            onTestInExperiment={testInExperimentAt}
          />
        )}
        {activeTab === "Signals" && (
          <SignalsTab
            onOpenEvaluator={(evalId) => {
              setActiveTab("Evals")
              toast.message("Opening evaluator", {
                description: `Navigating to the linked evaluator. Edit it to change this signal's scoring logic.`,
              })
            }}
          />
        )}
        {activeTab === "Dataset" && (
          <DatasetTab
            openDatasetName={datasetAutoOpenName}
            onOpenDatasetHandled={() => setDatasetAutoOpenName(null)}
          />
        )}
      </div>
    </div>
  )
}
