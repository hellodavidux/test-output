"use client"

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import type { ExperimentRunSeed } from "@/lib/experiment-run-seed"
import type { RunData } from "@/lib/analytics-runs"
import { formatAnalyticsRunTimestamp } from "@/lib/analytics-runs"
import { TabContext } from "@/components/dashboard-layout"
import { cn } from "@/lib/utils"
import {
  AlertCircle,
  Calculator,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Database,
  EyeOff,
  FileOutput,
  FilePenLine,
  Frown,
  History,
  Info,
  Lock,
  Mail,
  MoreHorizontal,
  Pencil,
  Play,
  Plus,
  Settings2,
  Shield,
  Target,
  TextCursorInput,
  Trash2,
  X,
  Zap,
} from "lucide-react"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerTitle,
} from "@/components/ui/drawer"
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

// ─── Workflow nodes available for intermediary config ─────────────────────────

type NodeField =
  | { key: string; label: string; type: "select"; options: { value: string; label: string }[] }
  | { key: string; label: string; type: "textarea"; placeholder: string }
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
        key: "system_prompt",
        label: "System prompt",
        type: "textarea",
        placeholder: "You are a helpful assistant…",
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

type WorkflowEvalSource = "output-1" | "output-2" | (typeof WORKFLOW_NODES)[number]["id"]

/** Which workflow output terminal feeds an experiment column (mock-backed). */
type ExperimentColumnOutput = WorkflowEvalSource

/** Must match a workflow node `id` present in the column header `Select` — invalid ids leave Radix `SelectValue` empty. */
const DEFAULT_EXPERIMENT_COLUMN_OUTPUT: (typeof WORKFLOW_NODES)[number]["id"] = "send-email"

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
  for (const n of WORKFLOW_NODES) {
    if (o === `${n.label} output` || (o.startsWith(n.label) && o.length < n.label.length + 16)) {
      return { evalSource: n.id }
    }
  }
  const arrow = o.match(/^(.+?)\s*(?:→|->)\s*output\s*$/i)
  if (arrow) {
    const left = arrow[1].trim()
    const found = WORKFLOW_NODES.find(
      (n) => left === n.label || left.includes(n.label) || n.label.includes(left),
    )
    if (found) return { evalSource: found.id }
    return { evalSource: "output-1" }
  }
  if (/\boutput\b/i.test(o) && !/workflow/i.test(o)) {
    return { evalSource: "output-1" }
  }
  return { evalSource: "output-1" }
}

/** Icon for “What to evaluate”: workflow nodes use their node icon; Output 1 / 2 use a file-output glyph. */
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
  const n = WORKFLOW_NODES.find((x) => x.id === evalSource)
  if (n) return <WorkflowNodeLucideIcon kind={n.iconKind} className={iconClass} />
  return <FileOutput className={iconClass} aria-hidden />
}

function outputLabelFromEvalSource(evalSource: WorkflowEvalSource): string {
  if (evalSource === "output-1") return "Output 1"
  if (evalSource === "output-2") return "Output 2"
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
  const n = WORKFLOW_NODES.find((x) => x.id === evalSource)
  return n?.label ?? o
}

/** Canvas / graph nodes the user can “pin” for this experiment column (prototype). */
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
}

type EvaluatorDef = {
  id: string
  label: string
  type: "score" | "reference"
  /** "3. Evaluation type" from the evaluator dialog (e.g. LLM judge, Compare to expected output). */
  evaluationType: string
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
}

// ─── Mock data ─────────────────────────────────────────────────────────────────

const INITIAL_EVALUATORS_DEF: EvaluatorDef[] = [
  { id: "ev-1", label: "Response accuracy", type: "reference", evaluationType: "Compare to expected output" },
  { id: "ev-2", label: "Tone & empathy", type: "score", evaluationType: "LLM judge" },
  { id: "ev-3", label: "Resolution completeness", type: "score", evaluationType: "LLM judge" },
  { id: "ev-4", label: "Escalation detection", type: "score", evaluationType: "LLM judge" },
]

/** Same strings as the Evaluators tab list — use for cross-tab mocks (e.g. Analytics run rows). */
export const EVALUATOR_DISPLAY_LABELS: readonly string[] = INITIAL_EVALUATORS_DEF.map((e) => e.label)

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
    const bl = WORKFLOW_NODES.find((n) => n.id === bOut)?.label ?? bOut
    const vl = WORKFLOW_NODES.find((n) => n.id === vOut)?.label ?? vOut
    lines.push(`Output terminal: ${bl} → ${vl}`)
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

/** Logged workflow runs — prototype list for “use input from a past run”. */
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

/** Default matrix rows — ids align with MOCK_CELL_OUTPUTS / MOCK_CELL_SCORES / MOCK_CELL_MATCH. */
const INITIAL_CASES: TestCase[] = [
  {
    id: "c-1",
    input:
      "I was charged twice for my Business plan last month — please refund the duplicate charge.",
    expected:
      '{"intent":"billing_dispute","priority":"high","action":"escalate_to_billing","sentiment":"frustrated"}',
  },
  {
    id: "c-2",
    input: "The chatbot widget isn't loading on our website after the latest update.",
    expected: "Escalated to engineering with ETA 24h; include browser version and console errors.",
  },
  {
    id: "c-3",
    input: "I can't log in — the password reset email never arrived. I've checked spam.",
    expected:
      "I'm sorry you're having trouble. I've manually triggered a new reset email — it should arrive within a few minutes. If you still don't receive it, please reply and I'll set a temporary password so you can get back in right away.",
  },
  {
    id: "c-4",
    input: "If I downgrade mid-cycle, do I get a refund for the unused time?",
    expected: "Refunds are returned to your original card within 5–10 business days after downgrade.",
  },
]

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
    "v-1": { "ev-1": 48, "ev-2": 46, "ev-3": 52, "ev-4": 61 },
    "v-2": { "ev-1": 96, "ev-2": 94, "ev-3": 88, "ev-4": 98 },
    "v-3": { "ev-1": 94, "ev-2": 92, "ev-3": 85, "ev-4": 97 },
  },
  "c-2": {
    "v-1": { "ev-1": 62, "ev-2": 58, "ev-3": 58, "ev-4": 55 },
    "v-2": { "ev-1": 91, "ev-2": 93, "ev-3": 94, "ev-4": 92 },
    "v-3": { "ev-1": 95, "ev-2": 96, "ev-3": 97, "ev-4": 93 },
  },
  "c-3": {
    "v-1": { "ev-1": 55, "ev-2": 52, "ev-3": 49, "ev-4": 72 },
    "v-2": { "ev-1": 93, "ev-2": 94, "ev-3": 96, "ev-4": 95 },
    "v-3": { "ev-1": 97, "ev-2": 98, "ev-3": 98, "ev-4": 96 },
  },
  "c-4": {
    "v-1": { "ev-1": 70, "ev-2": 68, "ev-3": 65, "ev-4": 80 },
    "v-2": { "ev-1": 88, "ev-2": 90, "ev-3": 92, "ev-4": 85 },
    "v-3": { "ev-1": 91, "ev-2": 93, "ev-3": 94, "ev-4": 87 },
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
  const row = MOCK_CELL_OUTPUTS[caseId]
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

function ScoreChip({ score }: { score: number | null; }) {
  if (score === null) return null
  return (
    <span className="inline-flex items-center tabular-nums text-[11px] font-medium text-foreground">
      {formatScoreTenPoint(score)}
    </span>
  )
}

function MatchChip({ match }: { match: boolean | null }) {
  if (match === null || match === false) return null
  return (
    <span className="text-[11px] font-medium text-foreground">match</span>
  )
}

function EvalGradingRow({ evalLabel, score, truncated, full, hasMore, isActive }: {
  evalLabel: string
  score: number
  truncated: string
  full: string
  hasMore: boolean
  isActive: boolean
}) {
  const [expanded, setExpanded] = React.useState(false)
  const showToggle = hasMore || expanded
  return (
    <div className={cn("px-4 py-2.5 flex flex-col gap-0.5", isActive && "bg-foreground/[0.02]")}>
      <div className="flex items-center gap-2">
        <ScoreChip score={score} />
        <span className="text-[11px] text-muted-foreground/60 truncate">{evalLabel}</span>
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
            {field.type === "textarea" && (
              <textarea
                value={values[field.key] ?? ""}
                onChange={(e) => onFieldChange(field.key, e.target.value)}
                placeholder={field.placeholder}
                rows={3}
                className="w-full resize-none rounded-lg border border-gray-200 bg-gray-50/50 px-3 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
              />
            )}
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
  const selected = WORKFLOW_NODES.find((n) => n.id === selectedId)
  const controlled = open !== undefined && onOpenChange !== undefined
  return (
    <Select
      value={selectedId || undefined}
      onValueChange={onSelect}
      {...(controlled ? { open, onOpenChange } : {})}
    >
      <SelectTrigger id={id} className="h-9 w-full min-w-0 gap-2 shadow-xs">
        <span className="flex min-w-0 flex-1 items-center gap-2">
          {selected ? (
            <WorkflowNodeLucideIcon kind={selected.iconKind} className="size-4 shrink-0 text-muted-foreground" />
          ) : null}
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

// ─── ExperimentTab ─────────────────────────────────────────────────────────────

function ExperimentTab({
  evalDefs,
  selectedEvalIds,
  setSelectedEvalIds,
  onOpenCreateEvaluator,
  onNavigateToWorkflow,
  seedCase,
}: {
  evalDefs: EvaluatorDef[]
  selectedEvalIds: string[]
  setSelectedEvalIds: React.Dispatch<React.SetStateAction<string[]>>
  onOpenCreateEvaluator: () => void
  /** After confirming “convert to draft”, switch the app to the main Workflow tab (prototype). */
  onNavigateToWorkflow?: () => void
  /** When set, the experiment table starts with one row (Run progress → Evaluate / Compare / Analytics Compare). */
  seedCase?: ExperimentRunSeed | null
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
  const [sheetDatasetId, setSheetDatasetId] = useState<string | null>(null)
  const [sheetRunId, setSheetRunId] = useState<string | null>(null)
  /** Side sheet: manual typing/samples vs dataset vs logged run (mutually exclusive). */
  const [inputSheetSource, setInputSheetSource] = useState<"manual" | "dataset" | "run">("manual")
  const [nodeSheet, setNodeSheet]       = useState<{ variantId: string; variantLabel: string } | null>(null)
  /** Side sheet: first pick whether to bind a saved workflow version or edit node overrides. */
  const [nodeSheetMode, setNodeSheetMode] = useState<"workflow-version" | "node-config">("node-config")
  /** Per-variant selected workflow snapshot when mode is "workflow-version". */
  const [variantWorkflowSnapshotId, setVariantWorkflowSnapshotId] = useState<Record<string, string>>({})
  const [cellSheet, setCellSheet]       = useState<{ caseId: string; variantId: string } | null>(null)
  const [addVariantOpen, setAddVariantOpen] = useState(false)
  const [newVariantDraft, setNewVariantDraft] = useState(emptyNewVariantDraft)

  const [addEvalMenuOpen, setAddEvalMenuOpen]         = useState(false)

  const [draftConfirmVariant, setDraftConfirmVariant] = useState<{ id: string; label: string } | null>(null)

  const [nodeConfigs, setNodeConfigs] = useState<Record<string, NodeConfig>>({})

  useEffect(() => {
    if (nodeSheet) setNodeSheetMode("node-config")
  }, [nodeSheet])

  const selectedEvalSummary = useMemo(() => {
    const labels = selectedEvalIds
      .map((id) => evalDefs.find((e) => e.id === id)?.label)
      .filter(Boolean) as string[]
    if (labels.length === 0) return null
    if (labels.length > 1) return `${labels.length} Evaluators Selected`
    return labels[0]
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
        id: `v-${Date.now()}`,
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
    setCases(prev => [...prev, { id: `c-${Date.now()}`, input: "", expected: "" }])
  }
  const removeCase = (id: string) => setCases(prev => prev.filter(c => c.id !== id))

  /** Single grid template so header, body, and footer columns share exact tracks (fixes flex row misalignment). Leading column: row actions; last column: Compare. */
  const experimentTableGridTemplate = useMemo(
    () =>
      `max-content ${showExpectedOutputColumn ? "minmax(120px, 1fr) minmax(96px, 1fr)" : "minmax(120px, 1fr)"} ${variants.map(() => "minmax(160px, 1fr)").join(" ")} max-content`,
    [variants.length, showExpectedOutputColumn],
  )

  /** Skip the blurred “choose an evaluator” gate when we opened from Run progress → Compare (seeded row). */
  const showTableSetupOverlay = selectedEvalIds.length === 0 && !seedCase

  const evaluatorSelectMenuContent = useMemo(
    () => (
      <>
        {evalDefs.map((ev) => (
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
              <span className="text-xs font-normal text-muted-foreground leading-tight">
                {ev.evaluationType}
              </span>
            </span>
          </DropdownMenuCheckboxItem>
        ))}
        {evalDefs.length > 0 ? <DropdownMenuSeparator /> : null}
        <DropdownMenuItem
          onSelect={() => {
            onOpenCreateEvaluator()
            setAddEvalMenuOpen(false)
          }}
        >
          Create new evaluator
        </DropdownMenuItem>
      </>
    ),
    [evalDefs, selectedEvalIds, toggleEvalInTable, onOpenCreateEvaluator],
  )

  return (
    <div className="flex min-h-0 min-w-0 flex-col h-full p-6 gap-4">

      {/* ── Top bar ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 flex-1 pr-2 text-sm leading-snug text-muted-foreground">
          Build a test matrix, compare workflow variants side by side, and run evaluators to see which configuration scores best.
        </p>
        <div className="flex shrink-0 items-center gap-2">

          {/* Evaluator selector — only in top bar once at least one evaluator is selected */}
          {!showTableSetupOverlay ? (
            <DropdownMenu open={addEvalMenuOpen} onOpenChange={setAddEvalMenuOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 h-8 min-w-[10rem] max-w-[280px] justify-between font-normal">
                  <span className={cn("flex min-w-0 flex-1 truncate text-left font-medium", selectedEvalSummary ? "text-foreground" : "text-muted-foreground")}>
                    {selectedEvalSummary ?? "Select evaluators"}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-56 w-64">
                {evaluatorSelectMenuContent}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}

          {/* Run */}
          <Button size="sm" className="gap-1.5 h-8 bg-foreground text-background hover:bg-foreground/90 disabled:opacity-60" disabled={isRunning || selectedEvalIds.length === 0}
            onClick={() => {
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
            }}>
            <Play className={cn("w-3.5 h-3.5", isRunning && "animate-spin")} />
            {isRunning ? "running…" : selectedEvalIds.length > 1 ? "run evaluators" : "run evaluator"}
          </Button>
        </div>
      </div>

      {/* ── Main table: scrolls inside card; card height hugs content up to max-h (no flex stretch) ── */}
      <div className="relative w-full max-w-full shrink-0 overflow-hidden rounded-xl border border-border/80 bg-background shadow-sm">
        <div className="max-h-[min(72vh,42rem)] w-full min-w-0 overflow-auto">
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
                {inputMode === "input" ? "Input" : "Trigger"}
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
              const workflowOutputLabel =
                WORKFLOW_NODES.find((n) => n.id === columnOutput)?.label ?? "Node output"
              const variantDiffLines =
                v.id === BASELINE_VARIANT_ID
                  ? null
                  : getVariantDiffTooltipLines(baselineVariant, v, nodeConfigs, variantWorkflowSnapshotId)
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
                              <span className="shrink-0 cursor-help border-b border-dotted border-muted-foreground/50 text-[11px] font-bold uppercase tracking-wide text-muted-foreground decoration-transparent hover:border-muted-foreground hover:text-foreground">
                                {v.label}
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
                        <SelectContent position="popper" align="start" className="min-w-[14rem]">
                          {WORKFLOW_NODES.map(n => (
                            <SelectItem key={n.id} value={n.id}>
                              <span className="flex items-center gap-2">
                                <WorkflowNodeLucideIcon kind={n.iconKind} />
                                {n.label}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {v.id !== BASELINE_VARIANT_ID && (
                        <div className="flex shrink-0 items-center gap-0.5">
                          <TooltipProvider delayDuration={300}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button type="button" onClick={() => setNodeSheet({ variantId: v.id, variantLabel: v.label })}
                                  className={cn("shrink-0 rounded px-1.5 py-0.5 text-[10px] transition-colors",
                                    node ? "text-gray-500 hover:text-gray-700" : "text-gray-300 hover:text-gray-500"
                                  )}
                                  aria-label="Variant settings"
                                >
                                  <Settings2 className="w-3 h-3" aria-hidden />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="text-xs">{node ? `${node.label} override` : "Variant settings"}</TooltipContent>
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
            <div className="flex min-w-0 items-center justify-center self-stretch border-b border-border/70 bg-muted/30 border-l border-border/60 px-2 py-2.5">
              <button
                type="button"
                onClick={() => setAddVariantOpen(true)}
                className="inline-flex h-8 max-w-none shrink-0 items-center justify-center gap-1.5 rounded-lg px-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
              >
                <Plus className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                Compare
              </button>
            </div>

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
                          aria-label="Save to dataset"
                          onClick={() =>
                            toast.message("Save to dataset", { description: "Not wired in this prototype." })
                          }
                        >
                          <Database className="h-3.5 w-3.5" aria-hidden />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        Save to dataset
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
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
                      setSheetDatasetId(null)
                      setSheetRunId(null)
                      setInputSheetSource("manual")
                      setInputSheet({ caseId: tc.id, field: "input" })
                    }}
                    className={cn(
                      "w-full min-w-0 text-left text-[13px] leading-snug truncate py-0.5 px-0 transition-colors cursor-pointer rounded-sm",
                      tc.input ? "text-foreground hover:bg-muted/30" : "text-muted-foreground hover:bg-muted/20"
                    )}>
                    {tc.input || (
                      <span className="opacity-50">
                        {inputMode === "input" ? "add workflow input…" : "add workflow trigger…"}
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
                  const output = hasRun ? (getExperimentMockOutput(tc.id, v, mockVKey) ?? null) : null
                  const activeEvalDefs = evalDefs.filter(
                    (ev) => ev.type !== "reference" && selectedEvalIds.includes(ev.id),
                  )
                  return (
                    <div
                      key={`${tc.id}-${v.id}`}
                      className={cn(
                        "relative flex min-h-0 min-w-0 border-r border-border/60 min-h-[4.25rem]",
                        !hasRun && "bg-muted/20"
                      )}
                    >
                      {/* Left sub-col: actual output */}
                      <div className="w-[38%] shrink-0 px-4 py-4 border-r border-border/40">
                        {isRunning ? (
                          <span className="text-[13px] text-muted-foreground/50 animate-pulse">…</span>
                        ) : output ? (
                          <button
                            type="button"
                            onClick={() => setCellSheet({ caseId: tc.id, variantId: v.id })}
                            className="text-left text-[13px] leading-snug text-muted-foreground hover:text-foreground transition-colors line-clamp-3 w-full"
                          >
                            {output}
                          </button>
                        ) : (
                          <span className="text-[13px] text-muted-foreground/40">—</span>
                        )}
                      </div>

                      {/* Right sub-col: evaluator gradings */}
                      <div className="flex-1 min-w-0 flex flex-col divide-y divide-border/40">
                        {isRunning ? (
                          <div className="px-4 py-4">
                            <span className="text-[13px] text-muted-foreground/50 animate-pulse">Evaluating…</span>
                          </div>
                        ) : !hasRun ? (
                          <div className="px-4 py-4">
                            <span className="text-[13px] text-muted-foreground/30">—</span>
                          </div>
                        ) : (
                          activeEvalDefs.map((ev) => {
                            const score =
                              MOCK_CELL_SCORES[tc.id]?.[v.id]?.[ev.id] ??
                              MOCK_CELL_SCORES[tc.id]?.[mockVKey]?.[ev.id] ??
                              null
                            const explanation =
                              MOCK_CELL_EXPLANATIONS[tc.id]?.[v.id]?.[ev.id] ??
                              MOCK_CELL_EXPLANATIONS[tc.id]?.[mockVKey]?.[ev.id] ??
                              null
                            if (score === null) return null
                            // truncate to 2 sentences
                            const sentences = explanation ? explanation.split(/(?<=[.!?])\s+/) : []
                            const truncated = sentences.slice(0, 2).join(" ")
                            const hasMore = sentences.length > 2
                            return (
                              <EvalGradingRow
                                key={ev.id}
                                evalLabel={ev.label}
                                score={score}
                                truncated={truncated}
                                full={explanation ?? ""}
                                hasMore={hasMore}
                                isActive={selectedEvalIds.includes(ev.id)}
                              />
                            )
                          })
                        )}
                      </div>
                    </div>
                  )
                })}
                <div
                  className={cn(
                    "min-w-0 border-l border-border/60",
                    !hasRun && "bg-muted/20"
                  )}
                  aria-hidden
                />
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
                        className="h-8 w-full max-w-[11rem] gap-1.5 px-2 font-normal"
                        onClick={() =>
                          setDraftConfirmVariant({
                            id: v.id,
                            label: v.label,
                          })
                        }
                      >
                        <FilePenLine className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                        <span className="truncate">Convert to draft</span>
                      </Button>
                    )}
                  </div>
                ))}
                <div className="min-w-0 border-l border-border/60 px-2 py-3" aria-hidden />
              </div>
            ) : null}
          </div>
        </div>

        {showTableSetupOverlay ? (
          <div
            className="absolute inset-0 z-20 flex items-center justify-center p-6"
            role="region"
            aria-label="Set up experiment"
          >
            <div
              className="absolute inset-0 rounded-[inherit] bg-[#f7f7f8] opacity-80 backdrop-blur-md"
              aria-hidden
            />
            <div className="relative flex flex-col items-center gap-3">
              <DropdownMenu open={addEvalMenuOpen} onOpenChange={setAddEvalMenuOpen}>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    size="sm"
                    className="h-9 gap-2 bg-foreground text-background hover:bg-foreground/90 shadow-sm"
                  >
                    choose an evaluator
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="bottom" align="center" className="w-56">
                  {evaluatorSelectMenuContent}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ) : null}
      </div>

      {/* ── Add test case ────────────────────────────────────────────── */}
      <Button variant="ghost" size="sm" className="h-auto px-2 py-1 text-muted-foreground hover:text-foreground font-normal gap-1.5 w-fit" onClick={addCase}>
        <Plus className="w-3.5 h-3.5" /> add test case
      </Button>

      <Dialog
        open={draftConfirmVariant != null}
        onOpenChange={(open) => {
          if (!open) setDraftConfirmVariant(null)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Convert to draft?</DialogTitle>
            <DialogDescription>
              A workflow draft will be created from{" "}
              <span className="font-medium text-foreground">
                {draftConfirmVariant?.label ?? "this variant"}
              </span>
              . You will be taken to the Workflow tab to review and publish.
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
                toast.success("Draft ready", {
                  description:
                    variantId != null
                      ? `Workflow draft from “${label}” is queued. Opening the Workflow editor.`
                      : "Opening the Workflow editor.",
                })
                onNavigateToWorkflow?.()
              }}
            >
              Go to Workflow
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Input / Expected side sheet ──────────────────────────────── */}
      {inputSheet && (() => {
        const tc = cases.find(c => c.id === inputSheet.caseId)!
        const isExpected = inputSheet.field === "expected"
        const isTrigger  = !isExpected && inputMode === "trigger"
        const activeDataset = sheetDatasetId ? MOCK_DATASETS.find(d => d.id === sheetDatasetId) ?? null : null
        const activeLoggedRun = sheetRunId ? MOCK_LOGGED_RUNS.find(r => r.id === sheetRunId) ?? null : null

        const TRIGGER_PAYLOADS = [
          { label: "New Slack message",  description: "User message in #general",     payload: `{\n  "event": "message",\n  "channel": "#general",\n  "user": "U012AB3CD",\n  "text": "Hello team!",\n  "ts": "1734000000.000100"\n}` },
          { label: "Form submission",    description: "Contact form via webhook",      payload: `{\n  "event": "form_submit",\n  "name": "Jane Doe",\n  "email": "jane@example.com",\n  "message": "I'd like a demo.",\n  "submitted_at": "2025-12-04T11:25:00Z"\n}` },
          { label: "Scheduled run",      description: "Cron trigger, no payload",      payload: `{\n  "event": "schedule",\n  "cron": "0 9 * * 1-5",\n  "triggered_at": "2025-12-04T09:00:00Z"\n}` },
        ]

        const datasetPanelJsx = (
          <div className="mt-1 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <p className="min-w-0 text-xs leading-relaxed text-gray-500">
                {isTrigger
                  ? "Each row replaces this case’s trigger payload (and expected if present)."
                  : "Each row replaces this case’s workflow input (and expected if present)."}
              </p>
              {activeDataset ? (
                <button type="button" onClick={() => setSheetDatasetId(null)} className="shrink-0 text-[11px] text-gray-400 transition-colors hover:text-gray-600">clear</button>
              ) : null}
            </div>
            <div className="relative">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button type="button" className={cn(
                    "flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                    activeDataset ? "border-gray-900 bg-gray-50 text-gray-900 ring-1 ring-gray-900" : "border-gray-200 bg-gray-50/50 text-gray-400 hover:border-gray-300"
                  )}>
                    <span className="flex items-center gap-2">
                      <Database className="h-3.5 w-3.5 shrink-0 text-gray-400" aria-hidden />
                      {activeDataset ? activeDataset.name : "Select a dataset…"}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 text-gray-400" aria-hidden />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-64">
                  <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Available datasets</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {MOCK_DATASETS.map(ds => (
                    <DropdownMenuItem key={ds.id} onClick={() => { setSheetDatasetId(ds.id); setSheetRunId(null) }} className="flex items-center justify-between gap-2">
                      <span>{ds.name}</span>
                      <span className="text-xs text-muted-foreground">{ds.rows.length} cases</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {activeDataset && (
              <>
                <div className="flex max-h-52 flex-col gap-1 overflow-y-auto">
                  {activeDataset.rows.map((row, ri) => (
                    <button
                      key={ri}
                      type="button"
                      onClick={() => {
                        setCases(prev => prev.map(c => c.id === inputSheet.caseId ? { ...c, input: row.input, expected: row.expected } : c))
                        setInputSheet(null)
                        setSheetDatasetId(null)
                        setSheetRunId(null)
                        setInputSheetSource("manual")
                      }}
                      className={cn(
                        "w-full rounded-md border px-3 py-2 text-left transition-colors",
                        tc.input === row.input ? "border-gray-900 bg-gray-50 ring-1 ring-gray-900" : "border-gray-100 hover:border-gray-200 hover:bg-gray-50/60"
                      )}
                    >
                      <p className="line-clamp-2 text-xs leading-snug text-gray-700">{row.input}</p>
                      {row.expected ? (
                        <p className="mt-0.5 truncate font-mono text-[10px] text-gray-400">{row.expected}</p>
                      ) : null}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const newCases: TestCase[] = activeDataset.rows.map(row => ({
                      id: `c-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                      input: row.input,
                      expected: row.expected,
                    }))
                    setCases(prev => [...prev, ...newCases])
                    setInputSheet(null)
                    setSheetDatasetId(null)
                    setSheetRunId(null)
                    setInputSheetSource("manual")
                  }}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-gray-300 bg-gray-50/50 py-2 text-xs font-medium text-gray-500 transition-colors hover:border-gray-400 hover:bg-gray-50 hover:text-gray-700"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden />
                  Load all {activeDataset.rows.length} cases as new rows
                </button>
              </>
            )}
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
                      onClick={() => { setSheetRunId(run.id); setSheetDatasetId(null) }}
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
                    setSheetDatasetId(null)
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
            <div className="fixed inset-0 z-40" onClick={() => { setInputSheet(null); setSheetDatasetId(null); setSheetRunId(null); setInputSheetSource("manual") }} />
            <div className="fixed right-0 top-0 bottom-0 z-50 flex flex-col w-[420px] bg-white border-l border-gray-200 shadow-xl">

              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {isExpected ? "Expected output" : isTrigger ? "Trigger payload" : "Input"}
                    {!isExpected && <span className="ml-1.5 text-xs font-normal text-gray-400">· Case {cases.indexOf(tc) + 1}</span>}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {isExpected ? "What the workflow should produce for this test case" : "What to send as the workflow input"}
                  </p>
                </div>
                <button type="button" onClick={() => { setInputSheet(null); setSheetDatasetId(null); setSheetRunId(null); setInputSheetSource("manual") }} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
              </div>

              <div className="flex-1 flex flex-col overflow-auto min-h-0">

                {/* ── Input / trigger: source, node type, content ── */}
                <div className={cn("flex-1 min-h-0 p-5 flex flex-col gap-3", !isExpected && "border-b border-gray-100")}>
                  {!isExpected ? (
                    <>
                      <div className="flex w-full shrink-0 flex-col gap-2">
                        <p className="text-xs font-medium text-gray-500">Input source</p>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className="flex w-full items-center justify-between gap-2 rounded-lg border border-gray-200 bg-gray-50/50 px-3 py-2 text-left text-sm text-gray-900 transition-colors hover:border-gray-300"
                            >
                              <span className="flex min-w-0 items-center gap-2">
                                {inputSheetSource === "manual" ? (
                                  <TextCursorInput className="h-3.5 w-3.5 shrink-0 text-gray-500" aria-hidden />
                                ) : inputSheetSource === "dataset" ? (
                                  <Database className="h-3.5 w-3.5 shrink-0 text-gray-400" aria-hidden />
                                ) : (
                                  <History className="h-3.5 w-3.5 shrink-0 text-gray-400" aria-hidden />
                                )}
                                <span className="truncate">
                                  {inputSheetSource === "manual"
                                    ? isTrigger
                                      ? "Manual — sample payloads"
                                      : "Manual — type in editor"
                                    : inputSheetSource === "dataset"
                                      ? (activeDataset?.name ?? "From a dataset")
                                      : activeLoggedRun
                                        ? `${activeLoggedRun.label} · ${activeLoggedRun.meta}`
                                        : "From a logged run"}
                                </span>
                              </span>
                              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-gray-400" aria-hidden />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-[14rem]">
                            <DropdownMenuItem
                              className={cn("flex flex-col items-start gap-0.5 py-2.5", inputSheetSource === "manual" && "font-medium")}
                              onClick={() => {
                                setInputSheetSource("manual")
                                setSheetDatasetId(null)
                                setSheetRunId(null)
                              }}
                            >
                              <span className="flex items-center gap-2 text-sm">
                                <TextCursorInput className="h-3.5 w-3.5 shrink-0 text-gray-500" aria-hidden />
                                Manual
                              </span>
                              <span className="pl-6 text-[11px] text-muted-foreground">
                                {isTrigger ? "Built-in sample payloads" : "Type or paste workflow input"}
                              </span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className={cn("flex flex-col items-start gap-0.5 py-2.5", inputSheetSource === "dataset" && "font-medium")}
                              onClick={() => {
                                setInputSheetSource("dataset")
                                setSheetRunId(null)
                              }}
                            >
                              <span className="flex items-center gap-2 text-sm">
                                <Database className="h-3.5 w-3.5 shrink-0 text-gray-400" aria-hidden />
                                From a dataset
                              </span>
                              <span className="pl-6 text-[11px] text-muted-foreground">Pick a saved dataset row</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className={cn("flex flex-col items-start gap-0.5 py-2.5", inputSheetSource === "run" && "font-medium")}
                              onClick={() => {
                                setInputSheetSource("run")
                                setSheetDatasetId(null)
                              }}
                            >
                              <span className="flex items-center gap-2 text-sm">
                                <History className="h-3.5 w-3.5 shrink-0 text-gray-400" aria-hidden />
                                From a logged run
                              </span>
                              <span className="pl-6 text-[11px] text-muted-foreground">Reuse input from a past workflow run</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <p className="text-[11px] leading-relaxed text-gray-400">
                        One active source per case — switching source clears the other pickers.
                      </p>

                      <div className="flex w-full shrink-0 flex-col gap-2">
                        <p className="text-xs font-medium text-gray-500">Input type</p>
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
                                <span className="truncate">{inputMode === "input" ? "Input node" : "Trigger node"}</span>
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
                              Input node
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className={cn("gap-2", inputMode === "trigger" && "font-medium")}
                              onClick={() => setInputMode("trigger")}
                            >
                              <Zap className="h-3.5 w-3.5 shrink-0 text-gray-500" aria-hidden />
                              Trigger node
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {inputSheetSource === "manual" && (
                        isTrigger ? (
                          <>
                            <p className="text-xs text-gray-400">Choose a sample payload</p>
                            {TRIGGER_PAYLOADS.map((option) => (
                              <button
                                key={option.label}
                                type="button"
                                onClick={() => {
                                  setCases(prev => prev.map(c => c.id === inputSheet.caseId ? { ...c, input: option.label } : c))
                                  setInputSheet(null)
                                  setSheetDatasetId(null)
                                  setSheetRunId(null)
                                  setInputSheetSource("manual")
                                }}
                                className={cn(
                                  "w-full rounded-lg border px-3.5 py-3 text-left transition-colors",
                                  tc.input === option.label ? "border-gray-900 bg-gray-50 ring-1 ring-gray-900" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50/60"
                                )}
                              >
                                <p className="text-sm font-medium text-gray-800">{option.label}</p>
                                <p className="mt-0.5 text-xs text-gray-400">{option.description}</p>
                                <pre className="mt-2 overflow-x-auto rounded-md bg-gray-50 px-2 py-1.5 text-[10px] leading-relaxed text-gray-400">{option.payload}</pre>
                              </button>
                            ))}
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
        const output = getExperimentMockOutput(tc.id, v, mockVKey) ?? ""
        const outSrc = v.columnOutput ?? DEFAULT_EXPERIMENT_COLUMN_OUTPUT
        return (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setCellSheet(null)} />
            <div className="fixed right-0 top-0 bottom-0 z-50 flex flex-col w-[440px] bg-white border-l border-gray-200 shadow-xl">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{v.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Case {cases.indexOf(tc) + 1} — output detail</p>
                </div>
                <button type="button" onClick={() => setCellSheet(null)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
              </div>
              <div className="flex-1 p-5 flex flex-col gap-5 overflow-auto">
                <div className="flex flex-col gap-1.5">
                  <p className="text-xs text-gray-400">Input</p>
                  <p className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5 text-sm text-gray-700">{tc.input}</p>
                </div>
                <div className="flex flex-col gap-1.5">
                  <p className="text-xs text-gray-400">Expected</p>
                  <p className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5 text-sm text-gray-700 font-mono">{tc.expected}</p>
                </div>
                <div className="flex flex-col gap-1.5">
                  <p className="text-xs text-gray-400">
                    Output{outSrc === "output-2" ? " (terminal 2)" : " (terminal 1)"}
                  </p>
                  <p className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5 text-sm text-gray-700">{output}</p>
                </div>
                <div className="flex flex-col gap-2">
                  <p className="text-xs text-gray-400">Scores</p>
                  {evalDefs.map(ev => {
                    const score = MOCK_CELL_SCORES[tc.id]?.[v.id]?.[ev.id] ?? null
                    const match = MOCK_CELL_MATCH[tc.id]?.[v.id] ?? null
                    return (
                      <div key={ev.id} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2">
                        <span className="text-sm text-gray-600">{ev.label}</span>
                        {ev.type === "reference" ? <MatchChip match={match} /> : <ScoreChip score={score} />}
                      </div>
                    )
                  })}
                </div>
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
                <DrawerTitle>New variant column</DrawerTitle>
                <DrawerDescription className="text-left">
                  Add a column that replays your cases with different workflow settings so you can compare outputs to the
                  baseline after a run.
                </DrawerDescription>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-medium text-muted-foreground">Step to change</p>
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
                    <p className="text-xs font-medium text-muted-foreground">Settings to compare</p>
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
    </div>
  )
}

const DIALOG_EVAL_TYPES = ["LLM judge", "Compare to expected output", "Contains", "Regex"] as const

function mapStoredEvalTypeToDialog(stored: string): string {
  if (DIALOG_EVAL_TYPES.includes(stored as (typeof DIALOG_EVAL_TYPES)[number])) return stored
  const lower = stored.toLowerCase()
  if (lower.includes("regex")) return "Regex"
  if (lower.includes("contain")) return "Contains"
  if (lower.includes("reference") || lower.includes("match") || lower.includes("expected output"))
    return "Compare to expected output"
  return "LLM judge"
}

function parseAutoRunFromStored(runWhen: string): boolean {
  const s = runWhen.toLowerCase()
  if (s.includes("manual only")) return false
  return true
}

function parseSamplePctFromStored(runScope: string): string {
  const m = runScope.match(/(\d+)\s*%/)
  if (m) return m[1]
  return "100"
}

const DEFAULT_LLM_JUDGE_MODEL = "gpt-4o"

const LLM_JUDGE_MODEL_OPTIONS: { value: string; label: string }[] = [
  { value: "gpt-4o", label: "GPT-4o" },
  { value: "gpt-4.1", label: "GPT-4.1" },
  { value: "o3-mini", label: "o3-mini" },
  { value: "claude-sonnet-4", label: "Claude Sonnet 4" },
]

function judgeModelDisplayLabel(value: string | undefined): string {
  if (!value) return LLM_JUDGE_MODEL_OPTIONS[0]?.label ?? DEFAULT_LLM_JUDGE_MODEL
  return LLM_JUDGE_MODEL_OPTIONS.find((o) => o.value === value)?.label ?? value
}

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
  const [evalSource, setEvalSource] = useState<WorkflowEvalSource>("output-1")
  const [evalType, setEvalType] = useState("LLM judge")
  const [expected, setExpected] = useState("")
  const [judgeModel, setJudgeModel] = useState(DEFAULT_LLM_JUDGE_MODEL)
  const [autoRun, setAutoRun] = useState(false)
  const [trigger, setTrigger] = useState("after-each")
  const [userGroup, setUserGroup] = useState("all")
  const [maxPerUser, setMaxPerUser] = useState("unlimited")

  useEffect(() => {
    if (!open) return
    if (editingEvaluator) {
      setName(editingEvaluator.name)
      const { evalSource: src } = parseOutputForForm(editingEvaluator.output)
      setEvalSource(src)
      setEvalType(mapStoredEvalTypeToDialog(editingEvaluator.type))
      setExpected(editingEvaluator.expected === "—" ? "" : editingEvaluator.expected)
      setJudgeModel(editingEvaluator.judgeModel ?? DEFAULT_LLM_JUDGE_MODEL)
      setAutoRun(parseAutoRunFromStored(editingEvaluator.runWhen))
      setTrigger("after-each")
      setUserGroup("all")
      setMaxPerUser("unlimited")
    } else {
      setName("")
      setEvalSource("output-1")
      setEvalType("LLM judge")
      setExpected("")
      setJudgeModel(DEFAULT_LLM_JUDGE_MODEL)
      setAutoRun(false)
      setTrigger("after-each")
      setUserGroup("all")
      setMaxPerUser("unlimited")
    }
  }, [open, editingEvaluator])

  const outputLabel = outputLabelFromEvalSource(evalSource)

  const triggerLabels: Record<string, string> = {
    "after-each": "After each workflow execution",
    "nightly": "Nightly — 02:00 UTC",
    "batch-finish": "On batch finish",
    "manual": "Manual only",
  }
  const userGroupLabels: Record<string, string> = {
    "all": "All users",
    "enterprise": "Enterprise plan",
    "high-priority": "Priority: high tickets",
    "new-users": "New users (< 30 days)",
    "sample-20": "20% random sample",
  }
  const runWhenLabel = autoRun
    ? `${triggerLabels[trigger] ?? trigger} — auto`
    : "Manual only — run from Experiment when you choose"
  const runScopeLabel = autoRun
    ? `${userGroupLabels[userGroup] ?? userGroup} · max ${maxPerUser === "unlimited" ? "unlimited" : maxPerUser + "×"} per user`
    : "Manual scope"

  type Step4Config =
    | { kind: "hidden" }
    | { kind: "llm-judge"; placeholder: string; hint: string }
    | { kind: "textarea"; title: string; placeholder: string; hint: string; mono?: boolean }
    | { kind: "rule"; title: string; placeholder: string; hint: string }

  const step4ForEvalType: Record<string, Step4Config> = {
    "LLM judge": {
      kind: "llm-judge",
      placeholder: `e.g.

Accuracy (0–10): Does the reply correctly address the user's issue?
Tone (0–10): Is the reply empathetic and professional?
Format compliance: pass / fail

Even lightweight structure like this improves consistency and debuggability.`,
      hint: "The judge uses this rubric to score each run — not a fixed reference string. Clear sections make scores easier to interpret and compare across variants.",
    },
    "Compare to expected output": {
      kind: "hidden",
    },
    "Rule validator": {
      kind: "rule",
      title: "4. Rule definition",
      placeholder: `e.g.

charge_age > 30d  →  escalate: true
priority: high    →  escalate: true
sentiment: frustrated  →  tone_score >= 4`,
      hint: "One rule per line. Each rule is evaluated against the node output. The evaluator passes if all rules match.",
    },
    Contains: {
      kind: "textarea",
      title: "4. Text that must appear",
      placeholder: "Enter the phrase or substring that must be present in the output…",
      hint: "Match is successful if this text appears anywhere in the evaluated output. Case-sensitive by default.",
    },
    Regex: {
      kind: "textarea",
      title: "4. Regular expression pattern",
      placeholder: 'e.g. ^\\s*\\{[\\s\\S]*"category"\\s*:\\s*"billing"[\\s\\S]*\\}\\s*$',
      hint: "The run passes if the pattern matches the full output or a substring (depending on your evaluator settings).",
      mono: true,
    },
  }

  const step4 = step4ForEvalType[evalType] ?? step4ForEvalType["LLM judge"]

  const buildRow = (): Omit<EvaluatorConfig, "id" | "ran"> => {
    const base: Omit<EvaluatorConfig, "id" | "ran"> = {
      name: name.trim() || "Untitled evaluator",
      output: outputLabel,
      type: evalType,
      expected: expected.trim() || "—",
      runWhen: runWhenLabel,
      runScope: runScopeLabel,
    }
    if (evalType === "LLM judge") return { ...base, judgeModel }
    return base
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[min(480px,95vw)] flex flex-col gap-0 p-0 overflow-hidden sm:max-w-none">
        <SheetHeader className="px-6 pt-6 pb-4 space-y-1.5 border-b border-border/60">
          <SheetTitle>{editingEvaluator ? "Edit evaluator" : "New evaluator"}</SheetTitle>
          <p className="text-sm text-muted-foreground">Configure what to score, how to compare it, and when to run automatically.</p>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-6">
          <section className="space-y-2">
            <Label htmlFor="eval-name">1. Name</Label>
            <Input
              id="eval-name"
              placeholder="e.g. Ticket categorization quality"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-9"
            />
          </section>

          <section className="space-y-2">
            <Label>2. What to evaluate</Label>
            <Select
              value={evalSource}
              onValueChange={(v) => setEvalSource(v as WorkflowEvalSource)}
            >
              <SelectTrigger className="w-full h-9">
                {/* One flex group so default justify-between does not push the label away from the icon */}
                <span className="flex min-w-0 flex-1 items-center gap-2">
                  <EvaluatedSourceIcon evalSource={evalSource} />
                  <SelectValue placeholder="Choose source" />
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="output-1">
                  <span className="flex items-center gap-2">
                    <EvaluatedSourceIcon evalSource="output-1" />
                    Output 1
                  </span>
                </SelectItem>
                <SelectItem value="output-2">
                  <span className="flex items-center gap-2">
                    <EvaluatedSourceIcon evalSource="output-2" />
                    Output 2
                  </span>
                </SelectItem>
                <SelectSeparator />
                {WORKFLOW_NODES.map((n) => (
                  <SelectItem key={n.id} value={n.id}>
                    <span className="flex items-center gap-2">
                      <WorkflowNodeLucideIcon kind={n.iconKind} />
                      {n.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Scores apply to {outputLabel.toLowerCase()}.</p>
          </section>

          <Separator />

          <section className="space-y-2">
            <Label>3. Evaluation type</Label>
            <Select value={evalType} onValueChange={setEvalType}>
              <SelectTrigger className="w-full h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LLM judge">LLM judge</SelectItem>
                <SelectItem value="Compare to expected output">Compare to expected output</SelectItem>
                <SelectItem value="Rule validator">Rule validator</SelectItem>
                <SelectItem value="Contains">Contains</SelectItem>
                <SelectItem value="Regex">Regex</SelectItem>
              </SelectContent>
            </Select>
          </section>

          {step4.kind === "hidden" ? (
            <section className="space-y-2">
              <Label>4. Ground truth (expected output)</Label>
              <div className="rounded-md border border-dashed border-border bg-muted/30 px-4 py-3 flex gap-3 items-start">
                <span className="mt-0.5 text-muted-foreground">
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7.5 1C3.91015 1 1 3.91015 1 7.5C1 11.0899 3.91015 14 7.5 14C11.0899 14 14 11.0899 14 7.5C14 3.91015 11.0899 1 7.5 1ZM6.8 4.5C6.8 4.11340 7.11340 3.8 7.5 3.8C7.88660 3.8 8.2 4.11340 8.2 4.5C8.2 4.88660 7.88660 5.2 7.5 5.2C7.11340 5.2 6.8 4.88660 6.8 4.5ZM8 11H7V6.5H8V11Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd" /></svg>
                </span>
                <div className="space-y-0.5">
                  <p className="text-sm font-medium text-foreground">Comes from each test case row</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    This evaluator compares the model output against the expected output you set per row in the experiment table — not a single fixed reference. Each test case can have its own gold answer.
                  </p>
                </div>
              </div>
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
                placeholder={step4.placeholder}
                value={expected}
                onChange={(e) => setExpected(e.target.value)}
                rows={4}
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

          <section className="space-y-4 rounded-lg border border-border/80 bg-muted/20 px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium">5. Auto-run</p>
              <Switch checked={autoRun} onCheckedChange={setAutoRun} />
            </div>

            {autoRun && (
              <div className="space-y-4 pt-1">
                {/* Trigger */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground font-normal">When to run</Label>
                  <Select value={trigger} onValueChange={setTrigger}>
                    <SelectTrigger className="h-9 w-full bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="after-each">After each workflow execution</SelectItem>
                      <SelectItem value="nightly">Nightly — 02:00 UTC</SelectItem>
                      <SelectItem value="batch-finish">On batch finish</SelectItem>
                      <SelectItem value="manual">Manual only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* User group */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground font-normal">Who to run for</Label>
                  <Select value={userGroup} onValueChange={setUserGroup}>
                    <SelectTrigger className="h-9 w-full bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All users</SelectItem>
                      <SelectItem value="enterprise">Enterprise plan</SelectItem>
                      <SelectItem value="high-priority">Priority: high tickets</SelectItem>
                      <SelectItem value="new-users">New users ({"<"} 30 days)</SelectItem>
                      <SelectItem value="sample-20">20% random sample</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Max per user */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground font-normal">Max runs per user</Label>
                  <div className="flex gap-2 items-center">
                    <Select value={maxPerUser} onValueChange={setMaxPerUser}>
                      <SelectTrigger className="h-9 w-full bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unlimited">Unlimited</SelectItem>
                        <SelectItem value="1">1× per user</SelectItem>
                        <SelectItem value="3">3× per user</SelectItem>
                        <SelectItem value="5">5× per user</SelectItem>
                        <SelectItem value="10">10× per user</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-xs text-muted-foreground">Caps how many times this evaluator runs per individual user across all sessions.</p>
                </div>
              </div>
            )}

            {!autoRun && (
              <p className="text-xs text-muted-foreground">Run manually from the Experiment tab whenever you choose.</p>
            )}
          </section>
        </div>
        <SheetFooter className="px-6 py-4 border-t border-border/60 gap-2 flex-row justify-end bg-muted/10">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => {
              onSave(buildRow(), editingEvaluator?.id)
              onOpenChange(false)
            }}
          >
            {editingEvaluator ? "Save changes" : "Save evaluator"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

// ─── Evaluators Tab ────────────────────────────────────────────────────────────

const INITIAL_EVALUATORS: EvaluatorConfig[] = [
  {
    id: 1,
    name: "Response accuracy",
    output: "Draft Response → output",
    type: "Reference match",
    expected: 'Match against gold reply — normalize whitespace, ignore greeting',
    runWhen: "After each cell completes — auto",
    runScope: "Full table · all variants · every user_id",
    ran: "531 runs",
  },
  {
    id: 2,
    name: "Tone & empathy",
    output: "Draft Response → output",
    type: "LLM judge",
    judgeModel: "gpt-4o",
    expected: "1–5 scale · must acknowledge frustration for priority:high tickets",
    runWhen: "Manual only — run from Experiment when you choose",
    runScope: "Manual scope",
    ran: "214 runs",
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
  },
  {
    id: 4,
    name: "Escalation detection",
    output: "Escalation Router → output",
    type: "Rule validator",
    expected: "charge_age > 30d → escalate:true · priority:high → escalate:true",
    runWhen: "Before Send Reply — blocking gate",
    runScope: "Production runs · staging excluded",
    ran: "531 runs",
  },
]

/** Evaluators tab table — 7 tracks (one per cell); Criteria gets the most flex; Auto run stays narrow. */
const EVALUATOR_TABLE_COL =
  "grid w-full grid-cols-[minmax(176px,1.25fr)_minmax(104px,0.78fr)_minmax(100px,0.72fr)_minmax(200px,2.35fr)_minmax(52px,0.38fr)_minmax(84px,0.62fr)_44px] gap-4 items-center"

/** Signals tab — separate grid so Evaluator column changes do not affect this table */
const SIGNAL_TABLE_COL =
  "grid grid-cols-[minmax(220px,1.75fr)_minmax(128px,0.95fr)_minmax(220px,1.45fr)_minmax(220px,1.35fr)_minmax(96px,0.6fr)_40px] gap-4 items-center"

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

function EvaluatorsTab({
  evaluators,
  onOpenCreateEvaluator,
  onEditEvaluator,
  onDeleteEvaluator,
  onCreateSignalFromEvaluator,
}: {
  evaluators: EvaluatorConfig[]
  onOpenCreateEvaluator: () => void
  onEditEvaluator: (ev: EvaluatorConfig) => void
  onDeleteEvaluator: (index: number) => void
  onCreateSignalFromEvaluator: (ev: EvaluatorConfig) => void
}) {
  return (
    <div className="flex flex-col h-full p-6 gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 flex-1 pr-2 text-sm leading-snug text-muted-foreground">
          Create and manage evaluators—LLM judges, rules, and validators—then choose which ones to run in sandbox experiments or attach to real live runs.
        </p>
        <Button variant="outline" size="sm" className="h-8 shrink-0" onClick={onOpenCreateEvaluator}>
          + New Evaluator
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border/80 bg-background shadow-sm">
        {/* Table header — Vercel-style: horizontal rules only, muted labels */}
        <div
          className={cn(
            EVALUATOR_TABLE_COL,
            "w-full min-w-[960px] px-4 py-2.5 border-b border-border/70 bg-muted/30 text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
          )}
        >
          <span>Evaluator</span>
          <span>What to evaluate</span>
          <span>Type</span>
          <span>Criteria</span>
          <span>Auto run</span>
          <span className="text-right">Activity</span>
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
              <div className="min-w-0 flex flex-col gap-0.5">
                {ev.name ? (
                  <span className="text-sm font-semibold text-foreground truncate">{ev.name}</span>
                ) : (
                  <span className="text-sm text-muted-foreground">—</span>
                )}
              </div>

              <div className="min-w-0 flex items-center gap-2">
                <EvaluatedSourceIcon evalSource={evaluatedSource} size="md" />
                <span className="text-[13px] text-foreground truncate block min-w-0" title={evaluatedSelectLabel}>
                  {evaluatedSelectLabel}
                </span>
              </div>

              <div className="min-w-0">
                {ev.type ? (
                  <span className="text-[13px] text-foreground">{ev.type}</span>
                ) : (
                  <span className="text-[13px] text-muted-foreground/50">—</span>
                )}
              </div>

              <div className="min-w-0">
                {ev.type === "LLM judge" ? (
                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] font-medium text-foreground/85">
                      {judgeModelDisplayLabel(ev.judgeModel)}
                    </span>
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
                  </div>
                ) : ev.expected && ev.expected !== "—" ? (
                  <div className="flex flex-col gap-1">
                    <p
                      className="text-[13px] text-muted-foreground leading-snug line-clamp-2"
                      title={ev.expected}
                    >
                      {ev.expected}
                    </p>
                  </div>
                ) : (
                  <span className="text-[13px] text-muted-foreground/50">—</span>
                )}
              </div>

              <div className="min-w-0">
                <span className="text-[13px] font-medium text-foreground">
                  {parseAutoRunFromStored(ev.runWhen) ? "Auto" : "Manual"}
                </span>
              </div>

              <div className="text-right tabular-nums">
                {ev.ran ? (
                  <span className="text-[13px] font-medium text-foreground">{ev.ran}</span>
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
                      aria-label="Evaluator actions"
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
                      className="gap-2 text-destructive focus:text-destructive"
                      onClick={() => onDeleteEvaluator(rowIndex)}
                    >
                      <Trash2 className="h-4 w-4 shrink-0 opacity-70" />
                      Delete
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="gap-2"
                      onClick={() => onCreateSignalFromEvaluator(ev)}
                    >
                      <Zap className="h-4 w-4 shrink-0 opacity-70" />
                      <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
                        <span>Create a signal</span>
                        <TooltipProvider delayDuration={200}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                className="inline-flex shrink-0 rounded-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                                aria-label="What is a signal?"
                                onClick={(e) => e.stopPropagation()}
                                onPointerDown={(e) => e.stopPropagation()}
                              >
                                <Info className="h-3.5 w-3.5" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="max-w-[260px] text-xs leading-relaxed">
                              Subscribe this evaluator’s results (scores or pass/fail) to the Signals tab so you can chart
                              trends, compare runs, and get alerts when quality drops.
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </span>
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

function NewDatasetModal({ open, onOpenChange, onSave }: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSave: (ds: DatasetItem) => void
}) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")

  useEffect(() => {
    if (!open) return
    setName("")
    setDescription("")
  }, [open])

  function handleSave() {
    onSave({ id: `ds-${Date.now()}`, name: name.trim() || "Untitled dataset", description: description.trim(), cases: [], updated: "Apr 22, 2026" })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/60 space-y-1">
          <DialogTitle>New dataset</DialogTitle>
          <DialogDescription>Give it a name and description. You can add test cases after.</DialogDescription>
        </DialogHeader>
        <div className="px-6 py-5 flex flex-col gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="ds-name">Name</Label>
            <Input id="ds-name" placeholder="e.g. Billing disputes" value={name} onChange={e => setName(e.target.value)} className="h-9" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ds-desc">Description <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Input id="ds-desc" placeholder="Short description of this dataset" value={description} onChange={e => setDescription(e.target.value)} className="h-9" />
          </div>
        </div>
        <DialogFooter className="px-6 py-4 border-t border-border/60 bg-muted/10 gap-2 sm:gap-2 flex-col sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={!name.trim()}>Save dataset</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function AddCasesModal({ open, onOpenChange, dataset, onSave }: {
  open: boolean
  onOpenChange: (v: boolean) => void
  dataset: DatasetItem | null
  onSave: (datasetId: string, newCases: DatasetCase[]) => void
}) {
  const [cases, setCases] = useState<DatasetCase[]>([{ id: "ac-1", input: "", expected: "" }])

  useEffect(() => {
    if (!open) return
    setCases([{ id: "ac-1", input: "", expected: "" }])
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/60 space-y-1">
          <DialogTitle>Add test cases</DialogTitle>
          <DialogDescription>
            Adding to <span className="font-medium text-foreground">{dataset?.name}</span> — {dataset?.cases.length ?? 0} existing row{(dataset?.cases.length ?? 0) !== 1 ? "s" : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-6 py-5">
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
        </div>
        <DialogFooter className="px-6 py-4 border-t border-border/60 bg-muted/10 gap-2 sm:gap-2 flex-col sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={cases.every(c => !c.input.trim())}>Save test cases</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DatasetTab() {
  const [datasets, setDatasets] = useState<DatasetItem[]>(INITIAL_DATASET_ITEMS)
  const [openDatasetId, setOpenDatasetId] = useState<string | null>(null)
  const [newDatasetOpen, setNewDatasetOpen] = useState(false)
  const [addCasesOpen, setAddCasesOpen] = useState(false)

  const openDataset = datasets.find(d => d.id === openDatasetId) ?? null

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
          <div className="overflow-x-auto rounded-xl border border-border/80 bg-background shadow-sm">
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
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm leading-snug text-muted-foreground">
          Click a dataset to view and manage its test cases.
        </p>
        <Button size="sm" className="h-8 shrink-0 gap-1.5" onClick={() => setNewDatasetOpen(true)}>
          <Plus className="h-3.5 w-3.5" /> New dataset
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border/80 bg-background shadow-sm">
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

type SignalListItem = {
  id: string
  name: string
  kind: string
  description: string
  scope: string
  updated: string
  subtitle?: string
  badge?: string
}

const INITIAL_SIGNAL_ITEMS: SignalListItem[] = [
  {
    id: "sig-accuracy",
    name: "Response accuracy",
    kind: "Score",
    description: "Mean exact-match against gold replies on billing dispute cases, normalized for whitespace and greeting variation.",
    scope: "All experiments · Billing disputes gold",
    updated: "Apr 16, 2026",
    subtitle: "Aggregated · mean · 0–1",
    badge: "Primary",
  },
  {
    id: "sig-latency",
    name: "Latency",
    kind: "Latency",
    description: "p95 end-to-end response time from trigger to Send Reply, covering intent classification and KB lookup.",
    scope: "Production · email + chatbot channels",
    updated: "Apr 17, 2026",
    subtitle: "Aggregated · p95 · ms",
  },
  {
    id: "sig-escalation",
    name: "Escalation detection rate",
    kind: "Score",
    description: "Fraction of runs where Escalation Router correctly flagged high-priority or >30-day-old charges for human review.",
    scope: "Production runs · billing dispute subset",
    updated: "Apr 17, 2026",
    subtitle: "Aggregated · rate · 0–1",
  },
]

type SignalTemplateId =
  | "failure"
  | "logic"
  | "task"
  | "friction"
  | "safety"
  | "hallucination"
  | "intent"
  | "blank"

const SIGNAL_TEMPLATES: {
  id: SignalTemplateId
  label: string
  icon: React.ReactNode
  kindLabel: string
  placeholder: string
}[] = [
  {
    id: "failure",
    label: "Failure",
    icon: <AlertCircle className="h-5 w-5" />,
    kindLabel: "Failure",
    placeholder: "Analyze this trace for failures, errors, or things that went wrong…",
  },
  {
    id: "logic",
    label: "Logic",
    icon: <Calculator className="h-5 w-5" />,
    kindLabel: "Logic",
    placeholder: "Describe logical inconsistencies, invalid reasoning steps, or broken assumptions…",
  },
  {
    id: "task",
    label: "Task",
    icon: <CheckCircle2 className="h-5 w-5" />,
    kindLabel: "Task",
    placeholder: "Check whether the agent completed the user task end-to-end…",
  },
  {
    id: "friction",
    label: "User friction",
    icon: <Frown className="h-5 w-5" />,
    kindLabel: "Friction",
    placeholder: "Spot confusing UX, retries, hesitation, or user frustration signals…",
  },
  {
    id: "safety",
    label: "Safety",
    icon: <Shield className="h-5 w-5" />,
    kindLabel: "Safety",
    placeholder: "Flag unsafe content, policy violations, or risky recommendations…",
  },
  {
    id: "hallucination",
    label: "Hallucination",
    icon: <EyeOff className="h-5 w-5" />,
    kindLabel: "Hallucination",
    placeholder: "Detect fabricated facts, unsupported claims, or contradictions with context…",
  },
  {
    id: "intent",
    label: "Intent",
    icon: <Target className="h-5 w-5" />,
    kindLabel: "Intent",
    placeholder: "Assess whether responses match the user’s stated intent…",
  },
  {
    id: "blank",
    label: "Blank",
    icon: <Plus className="h-5 w-5" />,
    kindLabel: "Custom",
    placeholder: "Describe what you're looking for in the trace…",
  },
]

type SignalSchemaRow = { id: string; name: string; type: string; description: string }

function CreateSignalSheet({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (payload: {
    name: string
    kind: string
    description: string
    templateId: SignalTemplateId
  }) => void
}) {
  const [templateId, setTemplateId] = useState<SignalTemplateId>("failure")
  const [name, setName] = useState("")
  const [prompt, setPrompt] = useState(SIGNAL_TEMPLATES[0].placeholder)
  const [testOpen, setTestOpen] = useState(false)
  const [schemaFields, setSchemaFields] = useState<SignalSchemaRow[]>([
    { id: "sf-1", name: "", type: "String", description: "" },
  ])

  const tpl = SIGNAL_TEMPLATES.find((t) => t.id === templateId) ?? SIGNAL_TEMPLATES[0]

  useEffect(() => {
    if (!open) return
    setTemplateId("failure")
    setName("")
    setPrompt(SIGNAL_TEMPLATES[0].placeholder)
    setTestOpen(false)
    setSchemaFields([{ id: `sf-${Date.now()}`, name: "", type: "String", description: "" }])
  }, [open])

  const selectTemplate = (id: SignalTemplateId) => {
    const next = SIGNAL_TEMPLATES.find((t) => t.id === id) ?? SIGNAL_TEMPLATES[0]
    setTemplateId(id)
    setPrompt(next.placeholder)
  }

  const addSchemaRow = () => {
    setSchemaFields((prev) => [
      ...prev,
      { id: `sf-${Date.now()}-${prev.length}`, name: "", type: "String", description: "" },
    ])
  }

  const removeSchemaRow = (id: string) => {
    setSchemaFields((prev) => (prev.length <= 1 ? prev : prev.filter((r) => r.id !== id)))
  }

  const updateSchemaRow = (id: string, patch: Partial<Omit<SignalSchemaRow, "id">>) => {
    setSchemaFields((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  const handleCreate = () => {
    const trimmed = name.trim() || "Untitled signal"
    onCreate({
      name: trimmed,
      kind: tpl.kindLabel,
      description: prompt.trim() || tpl.placeholder,
      templateId,
    })
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-[min(100vw-1rem,440px)] max-h-[100vh] flex-col gap-0 border-border bg-background p-0 sm:max-w-[440px]"
      >
        <SheetHeader className="space-y-1 border-b border-border/60 px-6 pb-4 pt-6 text-left">
          <SheetTitle className="text-lg font-semibold tracking-tight">Create new signal</SheetTitle>
          <p className="text-sm text-muted-foreground">
            Start from a template, then describe what to extract from traces.
          </p>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-6 py-5">
          <section className="space-y-2">
            <Label htmlFor="signal-template">Start from a template</Label>
            <Select
              value={templateId}
              onValueChange={(v) => selectTemplate(v as SignalTemplateId)}
            >
              <SelectTrigger id="signal-template" className="h-9 w-full">
                <SelectValue placeholder="Choose a template" />
              </SelectTrigger>
              <SelectContent>
                {SIGNAL_TEMPLATES.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    <span className="flex items-center gap-2">
                      <span className="shrink-0 text-muted-foreground [&_svg]:h-4 [&_svg]:w-4">
                        {t.icon}
                      </span>
                      {t.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </section>

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

          <section className="space-y-2">
            <Label htmlFor="signal-prompt">Signal Prompt</Label>
            <p className="text-xs text-muted-foreground">Describe what you&apos;re looking for in the trace.</p>
            <Textarea
              id="signal-prompt"
              placeholder={tpl.placeholder}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={5}
              className="min-h-[120px] resize-y"
            />
          </section>

          <section className="space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-foreground">Output Schema</p>
                <p className="text-xs text-muted-foreground">Define what gets extracted from each trace.</p>
              </div>
              <Button type="button" variant="outline" size="sm" className="h-8 shrink-0" onClick={addSchemaRow}>
                + Add Field
              </Button>
            </div>

            <div className="space-y-3">
              {schemaFields.map((row) => (
                <div
                  key={row.id}
                  className="flex flex-wrap items-end gap-2 rounded-lg border border-border/80 bg-muted/20 p-3"
                >
                  <div className="min-w-[100px] flex-1 space-y-1">
                    <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      Name
                    </span>
                    <Input
                      placeholder="Field name"
                      value={row.name}
                      onChange={(e) => updateSchemaRow(row.id, { name: e.target.value })}
                      className="h-9"
                    />
                  </div>
                  <div className="w-[112px] space-y-1">
                    <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      Type
                    </span>
                    <Select
                      value={row.type}
                      onValueChange={(v) => updateSchemaRow(row.id, { type: v })}
                    >
                      <SelectTrigger className="h-9 w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="String">String</SelectItem>
                        <SelectItem value="Number">Number</SelectItem>
                        <SelectItem value="Boolean">Boolean</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="min-w-[120px] flex-[2] space-y-1">
                    <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      Description
                    </span>
                    <Input
                      placeholder="Description of the field"
                      value={row.description}
                      onChange={(e) => updateSchemaRow(row.id, { description: e.target.value })}
                      className="h-9"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
                    onClick={() => removeSchemaRow(row.id)}
                    aria-label="Remove field"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </section>

          <Collapsible open={testOpen} onOpenChange={setTestOpen}>
            <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-lg border border-border/80 bg-muted/15 px-3 py-2.5 text-left transition-colors hover:bg-muted/30">
              <ChevronRight
                className={cn(
                  "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                  testOpen && "rotate-90"
                )}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">Test Signal</p>
                <p className="text-xs text-muted-foreground">Test this signal against an existing trace.</p>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <div className="rounded-lg border border-dashed border-border/80 bg-muted/10 px-4 py-6 text-center text-sm text-muted-foreground">
                Pick a trace from Traces to preview extraction — not wired in this prototype.
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        <SheetFooter className="flex flex-col gap-2 border-t border-border/60 bg-muted/10 px-6 py-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleCreate}>
            Create
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

function SignalsTab() {
  const [items, setItems] = useState<SignalListItem[]>(() => [...INITIAL_SIGNAL_ITEMS])
  const [createSignalOpen, setCreateSignalOpen] = useState(false)

  return (
    <div className="flex flex-col h-full p-6 gap-4">
      <CreateSignalSheet
        open={createSignalOpen}
        onOpenChange={setCreateSignalOpen}
        onCreate={({ name, kind, description }) => {
          const id = `sig-${Date.now()}`
          const updated = new Date().toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })
          setItems((prev) => [
            {
              id,
              name,
              kind,
              description,
              scope: "This workspace · all runs",
              updated,
            },
            ...prev,
          ])
          toast.success("Signal created", { description: `“${name}” is now on your list.` })
        }}
      />

      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 flex-1 pr-2 text-sm leading-snug text-muted-foreground">
          Describe outcomes and failures in plain language. We read every trace and produce structured events you can query, cluster, and alert on.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="h-8 shrink-0"
          type="button"
          onClick={() => setCreateSignalOpen(true)}
        >
          + add signal
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border/80 bg-background shadow-sm">
        <div
          className={cn(
            SIGNAL_TABLE_COL,
            "min-w-[860px] px-4 py-2.5 border-b border-border/70 bg-muted/30 text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
          )}
        >
          <span>Signal</span>
          <span>Kind</span>
          <span>Description</span>
          <span>Scope</span>
          <span className="text-right">Updated</span>
          <span className="sr-only">Actions</span>
        </div>

        <div className="min-w-[860px] divide-y divide-border/70">
          {items.map((sig) => (
            <div
              key={sig.id}
              className={cn(
                SIGNAL_TABLE_COL,
                "group px-4 py-4 min-h-[4.25rem] transition-colors",
                "hover:bg-muted/40"
              )}
            >
              <div className="min-w-0 flex flex-col gap-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-foreground truncate">{sig.name}</span>
                  {sig.badge ? (
                    <Badge variant="secondary" className="shrink-0 text-xs font-medium">
                      {sig.badge}
                    </Badge>
                  ) : null}
                </div>
                {sig.subtitle ? (
                  <span className="text-xs text-muted-foreground truncate" title={sig.subtitle}>
                    {sig.subtitle}
                  </span>
                ) : null}
              </div>

              <div className="min-w-0 flex items-center gap-2">
                <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", signalKindAccent(sig.kind))} aria-hidden />
                <span className="text-[13px] text-foreground">{sig.kind}</span>
              </div>

              <div className="min-w-0">
                <p className="text-[13px] text-muted-foreground leading-snug line-clamp-2" title={sig.description}>
                  {sig.description}
                </p>
              </div>

              <div className="min-w-0">
                <p className="text-xs font-mono text-muted-foreground leading-snug line-clamp-2" title={sig.scope}>
                  {sig.scope}
                </p>
              </div>

              <div className="text-right tabular-nums">
                <span className="text-[13px] font-medium text-foreground">{sig.updated}</span>
              </div>

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
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuItem
                    className="gap-2"
                    onClick={() =>
                      toast.message("Edit signal", { description: "Editor is not wired in this prototype." })
                    }
                  >
                    <Pencil className="h-4 w-4 shrink-0 opacity-70" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="gap-2 text-destructive focus:text-destructive"
                    onClick={() =>
                      toast.message("Remove signal", { description: "Removal is not wired in this prototype." })
                    }
                  >
                    <Trash2 className="h-4 w-4 shrink-0 opacity-70" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Main Evaluator component ──────────────────────────────────────────────────

const INNER_TABS = ["Experiment", "Evaluators", "Dataset", "Signals"] as const
type InnerTab = (typeof INNER_TABS)[number]

export function Evaluator({
  /** Set from the layout when using Run progress → Evaluate / Compare; lives in the parent so it survives Evaluator remounts (no blurred setup overlay). */
  experimentSeedFromRun,
  /** Main app tab: switch to Workflow after confirming “convert variant to draft” in Experiment. */
  onNavigateToWorkflow,
}: {
  experimentSeedFromRun?: ExperimentRunSeed | null
  onNavigateToWorkflow?: () => void
} = {}) {
  const [activeTab, setActiveTab] = useState<InnerTab>("Experiment")
  const [evaluators, setEvaluators] = useState<EvaluatorConfig[]>(INITIAL_EVALUATORS)
  const [evalDefs, setEvalDefs] = useState<EvaluatorDef[]>(INITIAL_EVALUATORS_DEF)
  const [selectedEvalIds, setSelectedEvalIds] = useState<string[]>(["ev-2"])
  const [createEvaluatorOpen, setCreateEvaluatorOpen] = useState(false)
  const [editingEvaluator, setEditingEvaluator] = useState<EvaluatorConfig | null>(null)

  useLayoutEffect(() => {
    if (!experimentSeedFromRun?.runId) return
    setSelectedEvalIds(evalDefs.map((e) => e.id))
    setActiveTab("Experiment")
  }, [experimentSeedFromRun, evalDefs])

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
      { id: evDefId, label: row.name, type: defType, evaluationType: row.type },
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
        d[idx] = { ...d[idx], label: row.name, type: defType, evaluationType: row.type }
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
      description: `“${ev.name}” is linked on the Signals tab. Adjust thresholds and notifications there.`,
    })
    setActiveTab("Signals")
  }, [])

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
            toast.success("Evaluator updated", {
              description: "Your changes are saved. Run it from the Experiment tab when you are ready.",
              action: {
                label: "Open Experiment",
                onClick: () => setActiveTab("Experiment"),
              },
              duration: 10_000,
            })
          } else {
            createEvaluator(row)
            toast.success("Evaluator created", {
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
                ? `${experimentSeedFromRun.runId}-${experimentSeedFromRun.input.slice(0, 48)}`
                : "default"
            }
            evalDefs={evalDefs}
            selectedEvalIds={selectedEvalIds}
            setSelectedEvalIds={setSelectedEvalIds}
            onOpenCreateEvaluator={() => {
              setEditingEvaluator(null)
              setCreateEvaluatorOpen(true)
            }}
            onNavigateToWorkflow={onNavigateToWorkflow}
            seedCase={experimentSeedFromRun ?? null}
          />
        )}
        {activeTab === "Evaluators" && (
          <EvaluatorsTab
            evaluators={evaluators}
            onOpenCreateEvaluator={() => {
              setEditingEvaluator(null)
              setCreateEvaluatorOpen(true)
            }}
            onEditEvaluator={editEvaluator}
            onDeleteEvaluator={deleteEvaluatorAt}
            onCreateSignalFromEvaluator={createSignalFromEvaluator}
          />
        )}
        {activeTab === "Dataset" && <DatasetTab />}
        {activeTab === "Signals" && <SignalsTab />}
      </div>
    </div>
  )
}
