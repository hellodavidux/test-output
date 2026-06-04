"use client"

import React, { useState, useEffect, useCallback } from "react"
import {
  AlertCircle,
  ArrowUpDown,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  CloudDownload,
  Copy,
  Filter,
  History,
  ListChecks,
  MoreHorizontal,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  Signal,
  Target,
  Timer,
  Trash2,
  TrendingDown,
  TrendingUp,
  X,
  Zap,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"

// ─── Types ─────────────────────────────────────────────────────────────────

type EvalType = "LLM Judge" | "Regex" | "Expected Output" | "Schema" | "Human Review"
type SignalStatus = "Active" | "Paused" | "Draft"
type RunResult = "Passed" | "Failed" | "Running"

interface EvalDef {
  id: string
  name: string
  type: EvalType
  target: string
  usedIn: string
  usedInNames: string[]
  version: string
  description?: string
  criteria?: string
  threshold?: number
}

interface SignalDef {
  id: string
  signal: string
  type: string
  scope: string
  prompt: string
  lastFired?: string
  usedIn: string
  usedInNames: string[]
  status: SignalStatus
}

interface RunRow {
  id: string
  project: string
  workflow: string
  evalSet: string
  result: RunResult
  duration: string
  cost: string
  timestamp: string
}

// ─── Mock Data ──────────────────────────────────────────────────────────────

const EVALS: EvalDef[] = [
  { id: "e1", name: "Tone & Helpfulness", type: "LLM Judge", target: "Assistant Output", usedIn: "12 projects", usedInNames: ["Support Bot", "Sales Copilot", "Onboarding Flow", "Finance Assistant", "HR Assistant", "Legal Advisor", "Marketing Bot", "Dev Assistant", "IT Helpdesk", "Recruiting Bot", "Customer Portal", "Executive Briefing"], version: "v3", description: "Evaluates whether the assistant response is helpful, on-topic, and maintains an appropriate professional tone.", criteria: "Score 1–10 on helpfulness (relevance, completeness) and tone (polite, not condescending). Fail if score < 7.", threshold: 7.0 },
  { id: "e2", name: "JSON Structure Match", type: "Schema", target: "Tool Result", usedIn: "4 workflows", usedInNames: ["Schema Validation", "Data Ingestion", "API Gateway", "Report Generator"], version: "v5", description: "Validates that tool outputs conform to the expected JSON schema.", criteria: "Response must be valid JSON matching the declared schema. Any missing required field = fail.", threshold: 1.0 },
  { id: "e3", name: "Expected Answer Match", type: "Expected Output", target: "Final Response", usedIn: "8 projects", usedInNames: ["Support Bot", "Sales Copilot", "Finance Assistant", "Legal Advisor", "Dev Assistant", "IT Helpdesk", "Marketing Bot", "HR Assistant"], version: "v1", description: "Compares the model output against a set of expected reference answers using fuzzy matching.", criteria: "Semantic similarity ≥ 0.85 against reference.", threshold: 0.85 },
  { id: "e4", name: "Hallucination Judge", type: "LLM Judge", target: "Entire Trace", usedIn: "6 projects", usedInNames: ["Sales Copilot", "Finance Assistant", "Legal Advisor", "Executive Briefing", "Medical Triage", "Compliance Bot"], version: "v2", description: "Detects factual inaccuracies or fabricated content in the model's response.", criteria: "Pass if no grounding violations detected. Any fabricated fact = fail.", threshold: 0 },
  { id: "e5", name: "Customer Satisfaction", type: "LLM Judge", target: "Assistant Output", usedIn: "3 workflows", usedInNames: ["Post-Chat Survey", "NPS Collection", "Feedback Loop"], version: "v1", description: "Estimates likely customer satisfaction score.", criteria: "CSAT proxy score 1–5. Threshold = 4.", threshold: 4.0 },
  { id: "e6", name: "PII Redaction Check", type: "Regex", target: "Final Response", usedIn: "9 projects", usedInNames: ["Support Bot", "HR Assistant", "Medical Triage", "Finance Assistant", "Legal Advisor", "Compliance Bot", "Customer Portal", "IT Helpdesk", "Recruiting Bot"], version: "v4", description: "Ensures no PII appears in any model output.", criteria: "Regex pattern matching against known PII formats. Any match = fail.", threshold: 0 },
  { id: "e7", name: "Tool Call Correctness", type: "Schema", target: "Tool Result", usedIn: "5 workflows", usedInNames: ["Data Ingestion", "API Gateway", "Lead Enrichment", "Report Generator", "Ticket Resolution"], version: "v2", description: "Validates that tool calls are well-formed.", criteria: "Deprecated in favor of JSON Structure Match v5.", threshold: 1.0 },
]

const SIGNALS: SignalDef[] = [
  { id: "s1", signal: "PII Detected", type: "Regex", scope: "Full workflow", prompt: "Match output against PII patterns (email, SSN, phone, credit card). Flag any run where PII appears in the final response.", lastFired: "2 hrs ago", usedIn: "9 projects", usedInNames: ["Support Bot", "HR Assistant", "Medical Triage", "Finance Assistant", "Legal Advisor", "Compliance Bot", "Customer Portal", "IT Helpdesk", "Recruiting Bot"], status: "Active" },
  { id: "s2", signal: "Latency Spike", type: "Code", scope: "Full workflow", prompt: "Check whether end-to-end latency exceeds 8 s. Return FAIL with the measured value if so, PASS otherwise.", lastFired: "Yesterday", usedIn: "6 workflows", usedInNames: ["Ticket Resolution", "Lead Enrichment", "Data Ingestion", "Report Generator", "API Gateway", "Email Draft"], status: "Active" },
  { id: "s3", signal: "Tool Failure Rate", type: "Code", scope: "Full workflow", prompt: "Compute the ratio of failed tool calls to total tool calls. Fire if the failure rate exceeds 5 % in the rolling 1-hour window.", lastFired: "Apr 14, 2026", usedIn: "4 projects", usedInNames: ["Data Pipeline", "Sales Copilot", "Finance Assistant", "Dev Assistant"], status: "Active" },
  { id: "s4", signal: "Escalation Risk", type: "LLM Judge", scope: "Full workflow", prompt: "Analyze this trace and estimate the likelihood of user escalation (0–1). Fire if the score exceeds 0.7. Consider repeated failures, expressed frustration, or unresolved issues.", lastFired: "3 days ago", usedIn: "3 workflows", usedInNames: ["Ticket Resolution", "Customer Portal", "Medical Triage"], status: "Active" },
  { id: "s5", signal: "High Cost Run", type: "Code", scope: "Full workflow", prompt: "Check whether the total token cost for this run exceeds $0.50. Return FAIL with the actual cost if so.", usedIn: "7 projects", usedInNames: ["Sales Copilot", "Legal Advisor", "Medical Triage", "Executive Briefing", "Finance Assistant", "Dev Assistant", "Marketing Bot"], status: "Paused" },
  { id: "s6", signal: "Low CSAT Proxy", type: "LLM Judge", scope: "Full workflow", prompt: "Estimate the likely customer satisfaction score (1–5) based on the assistant's response quality and tone. Fire if the estimated score falls below 3.5.", usedIn: "2 workflows", usedInNames: ["Post-Chat Survey", "Feedback Loop"], status: "Draft" },
  { id: "s7", signal: "Context Window Near Limit", type: "Code", scope: "Full workflow", prompt: "Check whether token usage exceeded 90 % of the model's context window. Return FAIL with the percentage if so.", lastFired: "5 hrs ago", usedIn: "5 projects", usedInNames: ["Legal Advisor", "Executive Briefing", "Medical Triage", "Dev Assistant", "Compliance Bot"], status: "Active" },
  { id: "s8", signal: "Negative User Feedback", type: "LLM Judge", scope: "Full workflow", prompt: "Detect signals of negative user sentiment in the conversation: explicit complaints, expressions of frustration, or abandonment phrases. Fire if negative feedback exceeds 10 % of daily sessions.", lastFired: "Today", usedIn: "4 workflows", usedInNames: ["Post-Chat Survey", "Feedback Loop", "NPS Collection", "Customer Portal"], status: "Active" },
]

// ─── Signal Templates ────────────────────────────────────────────────────────

type SignalTemplateId = "Failure" | "Hallucination" | "Human Review" | "Intent" | "Custom"

interface SignalTemplate {
  id: SignalTemplateId
  name: string
  description: string
  prompt: string
  colorClass: string
  bgClass: string
  borderClass: string
}

const SIGNAL_TEMPLATES: SignalTemplate[] = [
  {
    id: "Failure",
    name: "Failure",
    description: "Detect tool failures, API errors, timeouts, and broken outputs",
    prompt: "Analyze this workflow run for concrete failures. Look for tool call failures, API errors, timeouts, auth issues, retry loops, wrong tool selection, or broken and incomplete outputs. Only report issues visible in the run.",
    colorClass: "text-red-700 dark:text-red-400",
    bgClass: "bg-red-50 dark:bg-red-950/30",
    borderClass: "border-red-200 dark:border-red-900",
  },
  {
    id: "Hallucination",
    name: "Hallucination",
    description: "Detect unsupported claims and outputs not grounded in run context",
    prompt: "Analyze this workflow run for hallucinations or unsupported claims. Compare the final output against the user input, retrieved context, tool outputs, and available workflow data. Only flag claims that are not supported by the run context.",
    colorClass: "text-violet-700 dark:text-violet-400",
    bgClass: "bg-violet-50 dark:bg-violet-950/30",
    borderClass: "border-violet-200 dark:border-violet-900",
  },
  {
    id: "Human Review",
    name: "Human Review Needed",
    description: "Flag runs where a human should review before the result is trusted",
    prompt: "Analyze this workflow run and determine whether a human should review it before the result or action is trusted. Look for ambiguity, low confidence, sensitive decisions, compliance concerns, risky actions, or unresolved user needs.",
    colorClass: "text-amber-700 dark:text-amber-400",
    bgClass: "bg-amber-50 dark:bg-amber-950/30",
    borderClass: "border-amber-200 dark:border-amber-900",
  },
  {
    id: "Intent",
    name: "Intent",
    description: "Identify buying intent, churn risk, escalation, and other business signals",
    prompt: "Analyze this workflow run and identify whether it contains an important business or user intent worth notifying on. Examples include buying intent, refund request, churn risk, escalation request, urgent issue, feature request, or competitor mention.",
    colorClass: "text-blue-700 dark:text-blue-400",
    bgClass: "bg-blue-50 dark:bg-blue-950/30",
    borderClass: "border-blue-200 dark:border-blue-900",
  },
  {
    id: "Custom",
    name: "Custom",
    description: "Define your own detection criteria with a free-form prompt",
    prompt: "",
    colorClass: "text-muted-foreground",
    bgClass: "bg-muted/40",
    borderClass: "border-border",
  },
]

const RUNS: RunRow[] = [
  { id: "run-001", project: "Support Bot", workflow: "Ticket Resolution", evalSet: "Tone & Helpfulness + PII Check", result: "Passed", duration: "1m 12s", cost: "$0.042", timestamp: "2m ago" },
  { id: "run-002", project: "Data Pipeline", workflow: "Schema Validation", evalSet: "JSON Structure Match", result: "Failed", duration: "0m 38s", cost: "$0.008", timestamp: "14m ago" },
  { id: "run-003", project: "Sales Copilot", workflow: "Lead Enrichment", evalSet: "Hallucination Judge", result: "Passed", duration: "2m 04s", cost: "$0.091", timestamp: "1h ago" },
  { id: "run-004", project: "Support Bot", workflow: "Ticket Resolution", evalSet: "Tone & Helpfulness + PII Check", result: "Running", duration: "—", cost: "—", timestamp: "Just now" },
  { id: "run-005", project: "Onboarding Flow", workflow: "User Activation", evalSet: "Customer Satisfaction", result: "Failed", duration: "1m 55s", cost: "$0.067", timestamp: "3h ago" },
  { id: "run-006", project: "Finance Assistant", workflow: "Expense Reporting", evalSet: "JSON Structure Match + PII Check", result: "Passed", duration: "0m 52s", cost: "$0.021", timestamp: "5h ago" },
  { id: "run-007", project: "Sales Copilot", workflow: "Email Draft", evalSet: "Tone & Helpfulness", result: "Passed", duration: "1m 30s", cost: "$0.055", timestamp: "8h ago" },
  { id: "run-008", project: "Data Pipeline", workflow: "Schema Validation", evalSet: "JSON Structure Match", result: "Passed", duration: "0m 41s", cost: "$0.010", timestamp: "1d ago" },
]

// ─── Used In Tooltip ────────────────────────────────────────────────────────

function UsedInTooltip({ label, names }: { label: string; names: string[] }) {
  const router = useRouter()
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="cursor-default underline decoration-dotted underline-offset-2 decoration-muted-foreground/50">
            {label}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" align="start" className="p-0 overflow-hidden max-w-[220px]">
          <ul className="flex flex-col py-1">
            {names.map((name) => (
              <li key={name}>
                <button
                  className="w-full px-3 py-1 text-[12px] text-foreground text-left hover:bg-muted/60 transition-colors"
                  onClick={(e) => { e.stopPropagation(); router.push("/?tab=analytics") }}
                >
                  {name}
                </button>
              </li>
            ))}
          </ul>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// ─── Shared badge components ────────────────────────────────────────────────

function StatusBadge({ status }: { status: SignalStatus | RunResult }) {
  const styles: Record<string, string> = {
    Active: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900",
    Draft: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900",
    Deprecated: "bg-muted text-muted-foreground border-border",
    Paused: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900",
    Passed: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900",
    Failed: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900",
    Running: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900",
  }
  return (
    <Badge className={cn("border font-normal text-[11px] px-1.5 py-px rounded", styles[status] ?? "")}>
      {status}
    </Badge>
  )
}

function TypeBadge({ type }: { type: EvalType }) {
  return (
    <Badge className="border font-normal text-[11px] px-1.5 py-px rounded bg-muted text-muted-foreground border-border">
      {type}
    </Badge>
  )
}

// ─── Eval Details Drawer ─────────────────────────────────────────────────────

function EvalDetailsDrawer({ eval: evalDef, open, onOpenChange }: { eval: EvalDef | null; open: boolean; onOpenChange: (v: boolean) => void }) {
  const [testInput, setTestInput] = useState("")
  const [testOutput, setTestOutput] = useState("")
  const [testResult, setTestResult] = useState<null | { score: number; pass: boolean; rationale: string }>(null)
  const [running, setRunning] = useState(false)

  function runTest() {
    if (!testInput || !testOutput) return
    setRunning(true)
    setTestResult(null)
    setTimeout(() => {
      setTestResult({ score: 7.8, pass: true, rationale: "The response is helpful and addresses the question directly. Tone is professional. Minor deduction for missing a concrete example." })
      setRunning(false)
    }, 1200)
  }

  if (!evalDef) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[min(100vw-2rem,30rem)] p-0 flex flex-col gap-0 overflow-hidden">
        <SheetTitle className="sr-only">{evalDef.name}</SheetTitle>
        <SheetDescription className="sr-only">Eval definition details</SheetDescription>

        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="flex flex-col gap-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[13px] font-semibold text-foreground">{evalDef.name}</span>
              <TypeBadge type={evalDef.type} />
            </div>
            <p className="text-[12px] text-muted-foreground line-clamp-2">{evalDef.description}</p>
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => onOpenChange(false)}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto divide-y divide-border">
          <DrawerSection label="Definition">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <DetailRow label="Type" value={<TypeBadge type={evalDef.type} />} />
              <DetailRow label="Version" value={<code className="text-[11px] bg-muted px-1.5 py-0.5 rounded font-mono">{evalDef.version}</code>} />
              <DetailRow label="Target" value={evalDef.target} />
              <DetailRow label="Used in" value={evalDef.usedIn} />
            </div>
          </DrawerSection>
          <DrawerSection label="Criteria">
            <p className="text-[12px] text-muted-foreground leading-relaxed">{evalDef.criteria}</p>
          </DrawerSection>
          <DrawerSection label="Threshold">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2.5 py-1.5">
                <span className="text-[12px] font-mono text-foreground">≥ {evalDef.threshold}</span>
              </div>
              <span className="text-[11px] text-muted-foreground">Org default. Projects can override per-attachment.</span>
            </div>
          </DrawerSection>
        </div>

        <div className="border-t border-border px-4 py-3 flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" className="h-7 text-[12px] gap-1.5 flex-1"><Copy className="h-3 w-3" />Duplicate</Button>
          <Button size="sm" className="h-7 text-[12px] gap-1.5 flex-1 bg-foreground text-background hover:bg-foreground/90"><Zap className="h-3 w-3" />Attach to Project</Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function DrawerSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="px-5 py-3.5 flex flex-col gap-2.5">
      <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
      {children}
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <span className="text-[12px] text-foreground">{value}</span>
    </div>
  )
}

// ─── Run Details Drawer ──────────────────────────────────────────────────────

function RunDetailsDrawer({ run, open, onOpenChange }: { run: RunRow | null; open: boolean; onOpenChange: (v: boolean) => void }) {
  const [expandedSection, setExpandedSection] = useState<string | null>("eval-results")
  if (!run) return null
  function toggle(key: string) { setExpandedSection((v) => (v === key ? null : key)) }

  const sections = [
    { key: "inputs", label: "Inputs", content: <div className="font-mono text-[11px] text-muted-foreground bg-muted/40 rounded p-2 leading-relaxed">{`{ "user_message": "Can you help me update my billing information?", "session_id": "sess_9k2x", "user_tier": "pro" }`}</div> },
    { key: "outputs", label: "Outputs", content: <div className="font-mono text-[11px] text-muted-foreground bg-muted/40 rounded p-2 leading-relaxed">{`{ "response": "Of course! To update your billing info, go to Settings → Billing → Payment Method.", "tokens": 54, "latency_ms": 842 }`}</div> },
    { key: "eval-results", label: "Eval Results", content: (
      <div className="flex flex-col gap-2">
        {[{ name: "Tone & Helpfulness", type: "LLM Judge", score: "8.2", pass: true, threshold: "≥ 7.0" }, { name: "PII Redaction Check", type: "Regex", score: "Pass", pass: true, threshold: "= 0" }].map((er) => (
          <div key={er.name} className={cn("flex items-center justify-between rounded-md border px-3 py-2 text-[12px]", er.pass ? "border-emerald-200/60 bg-emerald-50/50 dark:border-emerald-900/60 dark:bg-emerald-950/20" : "border-red-200/60 bg-red-50/50")}>
            <div className="flex flex-col gap-0.5">
              <span className="font-medium text-foreground">{er.name}</span>
              <span className="text-[10px] text-muted-foreground">{er.type} · threshold {er.threshold}</span>
            </div>
            <div className="flex items-center gap-2">
              <code className="font-mono text-[11px] bg-background border border-border px-1.5 py-px rounded">{er.score}</code>
              <StatusBadge status={er.pass ? "Passed" : "Failed"} />
            </div>
          </div>
        ))}
      </div>
    )},
    { key: "signals", label: "Signals Triggered", content: <div className="text-[12px] text-muted-foreground italic">No signals triggered for this run.</div> },
    { key: "logs", label: "Logs", content: (
      <div className="flex flex-col gap-0.5 font-mono text-[11px]">
        {[{ ts: "00:00.000", level: "INFO", msg: "Run started — eval set loaded" }, { ts: "00:00.041", level: "INFO", msg: "Invoking Tone & Helpfulness v3" }, { ts: "00:00.893", level: "INFO", msg: "LLM Judge response received: score=8.2" }, { ts: "00:00.897", level: "INFO", msg: "Regex check complete: 0 matches" }, { ts: "00:00.898", level: "INFO", msg: "Run complete — result: Passed" }].map((log, i) => (
          <div key={i} className="flex gap-2 text-muted-foreground">
            <span className="text-[10px] text-muted-foreground/60 shrink-0">{log.ts}</span>
            <span className="text-emerald-600 dark:text-emerald-400 shrink-0">{log.level}</span>
            <span>{log.msg}</span>
          </div>
        ))}
      </div>
    )},
  ]

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[min(100vw-2rem,34rem)] p-0 flex flex-col gap-0 overflow-hidden">
        <SheetTitle className="sr-only">Run {run.id}</SheetTitle>
        <SheetDescription className="sr-only">Run details</SheetDescription>
        <div className="flex items-start justify-between border-b border-border px-5 py-4">
          <div className="flex flex-col gap-1.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <code className="text-[12px] font-mono font-medium text-foreground">{run.id}</code>
              <StatusBadge status={run.result} />
            </div>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap">
              <span>{run.project}</span><ChevronRight className="h-3 w-3" /><span>{run.workflow}</span>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1"><Timer className="h-3 w-3" />{run.duration}</span>
              <span className="flex items-center gap-1"><Zap className="h-3 w-3" />{run.cost}</span>
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{run.timestamp}</span>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => onOpenChange(false)}><X className="h-3.5 w-3.5" /></Button>
        </div>
        <div className="px-5 py-2 border-b border-border bg-muted/20 flex items-center gap-2">
          <ListChecks className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="text-[11px] text-muted-foreground">{run.evalSet}</span>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-border">
          {sections.map((section) => (
            <div key={section.key}>
              <button onClick={() => toggle(section.key)} className="flex w-full items-center justify-between px-5 py-3 text-[12px] font-medium text-foreground hover:bg-muted/30 transition-colors">
                <span>{section.label}</span>
                <ChevronRight className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", expandedSection === section.key && "rotate-90")} />
              </button>
              {expandedSection === section.key && <div className="px-5 pb-4">{section.content}</div>}
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ─── Evals Tab ───────────────────────────────────────────────────────────────

const INNER_TABS = ["Evals", "Signals", "Runs"] as const
type InnerTab = (typeof INNER_TABS)[number]

const TAB_SLUG: Record<InnerTab, string> = { Evals: "evals", Signals: "signals", Runs: "runs" }
const SLUG_TAB: Record<string, InnerTab> = { evals: "Evals", signals: "Signals", runs: "Runs" }

function EvalsContent() {
  const [search, setSearch] = useState("")
  const [selectedEval, setSelectedEval] = useState<EvalDef | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const filtered = EVALS.filter((e) =>
    !search || e.name.toLowerCase().includes(search.toLowerCase()) || e.type.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      {/* Search + filters row */}
      <div className="flex items-center gap-2 px-6 py-3 bg-[#f7f7f8]">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search evals…" className="h-8 pl-8 text-[13px] bg-transparent border-0 border-b border-border/0 rounded-none focus-visible:ring-0 px-8 placeholder:text-muted-foreground" />
          {search && <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="h-3 w-3" /></button>}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-[13px]">
                <Filter className="h-3.5 w-3.5" />
                Filters
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuLabel className="text-[11px]">Type</DropdownMenuLabel>
              {(["LLM Judge", "Regex", "Expected Output", "Schema", "Human Review"] as EvalType[]).map((t) => (
                <DropdownMenuItem key={t} className="text-[12px]">{t}</DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto px-6 py-4 bg-[#f7f7f8]">
        <Card className="gap-0 py-0 overflow-hidden">
          <CardContent className="p-0">
        <Table>
          <TableHeader className="bg-muted/60">
            <TableRow className="border-b border-border hover:bg-transparent">
              <TableHead className="pl-6 text-xs font-medium text-muted-foreground w-[220px]">
                <button className="flex items-center gap-1 hover:text-foreground">Name <ArrowUpDown className="h-3 w-3" /></button>
              </TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground">Type</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground hidden lg:table-cell">Target Node</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground hidden md:table-cell">Used In</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground hidden lg:table-cell">Criteria</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((e) => (
              <TableRow key={e.id} className="cursor-pointer group hover:bg-muted/50" onClick={() => { setSelectedEval(e); setDrawerOpen(true) }}>
                <TableCell className="pl-6">
                  <span className="text-[13px] font-medium text-foreground">{e.name}</span>
                </TableCell>
                <TableCell><TypeBadge type={e.type} /></TableCell>
                <TableCell className="text-[13px] text-muted-foreground hidden lg:table-cell">{e.target}</TableCell>
                <TableCell className="text-[13px] text-muted-foreground hidden md:table-cell">
                  <UsedInTooltip label={e.usedIn} names={e.usedInNames} />
                </TableCell>
                <TableCell className="px-3 py-3 align-top hidden lg:table-cell">
                  <div className="flex flex-col gap-1">
                    {e.criteria ? (
                      <p className="text-xs text-muted-foreground leading-snug line-clamp-2" title={e.criteria}>
                        {e.criteria}
                      </p>
                    ) : (
                      <span className="text-xs text-muted-foreground/50">—</span>
                    )}
                    {e.threshold != null && (
                      <span className="inline-flex w-fit items-center gap-1 rounded border border-border/70 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                        <Target className="h-2.5 w-2.5 shrink-0" aria-hidden />
                        pass ≥ {e.threshold.toFixed(1)}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(ev) => ev.stopPropagation()}>
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem className="text-[12px]"><Zap className="h-3.5 w-3.5" />Attach</DropdownMenuItem>
                      <DropdownMenuItem className="text-[12px]"><Settings2 className="h-3.5 w-3.5" />Edit</DropdownMenuItem>
                      <DropdownMenuItem className="text-[12px]"><Copy className="h-3.5 w-3.5" />Duplicate</DropdownMenuItem>
                      <DropdownMenuItem className="text-[12px]"><History className="h-3.5 w-3.5" />View Runs</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-[12px] text-destructive focus:text-destructive"><Trash2 className="h-3.5 w-3.5" />Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
          </CardContent>
        </Card>
      </div>
      <EvalDetailsDrawer eval={selectedEval} open={drawerOpen} onOpenChange={setDrawerOpen} />
    </>
  )
}

// ─── Signals Content ─────────────────────────────────────────────────────────

function SignalsContent() {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const filtered = SIGNALS.filter((s) =>
    !search || s.signal.toLowerCase().includes(search.toLowerCase()) || s.type.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      <div className="flex items-center gap-2 px-6 py-3 bg-[#f7f7f8]">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search signals…" className="h-8 pl-8 text-[13px] bg-transparent border-0 rounded-none focus-visible:ring-0 px-8 placeholder:text-muted-foreground" />
        </div>
        <div className="ml-auto">
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-[13px]">
            <Filter className="h-3.5 w-3.5" />Filters
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-6 py-4 bg-[#f7f7f8]">
        <Card className="gap-0 py-0 overflow-hidden">
          <CardContent className="p-0">
        <Table>
          <TableHeader className="bg-muted/60">
            <TableRow className="border-b border-border hover:bg-transparent">
              <TableHead className="pl-6 text-xs font-medium text-muted-foreground w-[200px]">Signal</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground w-28">Type</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground hidden md:table-cell w-32">Scope</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground hidden lg:table-cell">Signal prompt</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground hidden md:table-cell w-28">Last fired</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground w-20">Status</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground w-24">Projects</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((s) => (
              <TableRow key={s.id} className="group cursor-default hover:bg-muted/50">
                <TableCell className="pl-6">
                  <span className="text-[13px] font-medium text-foreground">{s.signal}</span>
                </TableCell>
                <TableCell>
                  <span className="inline-flex items-center rounded-md border border-border bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                    {s.type}
                  </span>
                </TableCell>
                <TableCell className="text-[13px] text-muted-foreground hidden md:table-cell">{s.scope}</TableCell>
                <TableCell className="hidden lg:table-cell">
                  <span className="text-xs text-muted-foreground">{s.prompt}</span>
                </TableCell>
                <TableCell className="text-[12px] text-muted-foreground hidden md:table-cell tabular-nums">
                  {s.lastFired ?? <span className="text-muted-foreground/40">Never</span>}
                </TableCell>
                <TableCell><StatusBadge status={s.status} /></TableCell>
                <TableCell className="text-[13px] text-muted-foreground cursor-pointer" onClick={() => router.push("/analytics")}>
                  <UsedInTooltip label={s.usedIn} names={s.usedInNames} />
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem className="text-[12px]"><Zap className="h-3.5 w-3.5" />Attach</DropdownMenuItem>
                      <DropdownMenuItem className="text-[12px]"><Settings2 className="h-3.5 w-3.5" />Edit</DropdownMenuItem>
                      <DropdownMenuItem className="text-[12px]"><Copy className="h-3.5 w-3.5" />Duplicate</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-[12px] text-muted-foreground"><Trash2 className="h-3.5 w-3.5" />Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
          </CardContent>
        </Card>
      </div>
    </>
  )
}

// ─── Runs Content ────────────────────────────────────────────────────────────

function RunsContent() {
  return (
    <div className="flex-1 flex items-center justify-center bg-[#f7f7f8]" />
  )
}

// ─── Signal Template Picker ──────────────────────────────────────────────────

function SignalTemplatePicker({ open, onOpenChange, onSelect }: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSelect: (t: SignalTemplate) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[440px] p-0 gap-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-5 pt-5 pb-3 space-y-1">
          <DialogTitle className="text-[15px]">New Signal</DialogTitle>
          <DialogDescription className="text-[13px]">Choose a template to get started, or define your own with Custom.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2 px-5 pb-5">
          {SIGNAL_TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => { onSelect(t); onOpenChange(false) }}
              className={cn(
                "flex flex-col gap-1.5 rounded-lg border p-3.5 text-left transition-all hover:shadow-sm",
                t.bgClass, t.borderClass,
                t.id === "Custom" && "col-span-2"
              )}
            >
              <span className={cn("text-[13px] font-semibold", t.colorClass)}>{t.name}</span>
              <span className="text-[11px] text-muted-foreground leading-relaxed">{t.description}</span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Create Signal Sheet ─────────────────────────────────────────────────────

function CreateSignalSheet({ open, onOpenChange, template }: {
  open: boolean
  onOpenChange: (v: boolean) => void
  template: SignalTemplate | null
}) {
  const [name, setName] = useState("")
  const [prompt, setPrompt] = useState("")

  useEffect(() => {
    if (template) {
      setName(template.id === "Custom" ? "" : template.name)
      setPrompt(template.prompt)
    }
  }, [template])

  if (!template) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[min(100vw-2rem,32rem)] p-0 flex flex-col gap-0 overflow-hidden">
        <SheetTitle className="sr-only">Create Signal</SheetTitle>
        <SheetDescription className="sr-only">Create a new signal from a template</SheetDescription>

        <div className="flex items-center justify-between border-b border-border px-5 py-4 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-semibold text-foreground">New Signal</span>
            <Badge className={cn("border font-normal text-[11px] px-1.5 py-px rounded", template.colorClass, template.bgClass, template.borderClass)}>
              {template.name}
            </Badge>
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => onOpenChange(false)}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="px-5 py-4 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium text-foreground">Signal name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={template.id === "Custom" ? "e.g. Low confidence answer" : template.name}
                className="h-8 rounded-md border border-border bg-muted/40 px-3 text-[13px] focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium text-foreground">Detection prompt</label>
              <p className="text-[11px] text-muted-foreground -mt-0.5">Describe what StackAI should look for in each workflow run.</p>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={template.id === "Custom" ? "Describe what you want StackAI to detect in each workflow run." : ""}
                className="text-[12px] min-h-[140px] resize-none bg-muted/40 border-border/60"
                rows={7}
              />
            </div>
          </div>
        </div>

        <div className="border-t border-border px-5 py-3 flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" className="h-7 text-[12px]" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            size="sm"
            className="h-7 text-[12px] gap-1.5 ml-auto bg-foreground text-background hover:bg-foreground/90"
            disabled={!name.trim() || !prompt.trim()}
          >
            <Plus className="h-3 w-3" />Create Signal
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function OrgEvaluator({ defaultTab = "evals" }: { defaultTab?: string }) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<InnerTab>(SLUG_TAB[defaultTab] ?? "Evals")

  const handleTabChange = useCallback((tab: InnerTab) => {
    setActiveTab(tab)
    router.push(`/org-evaluator/${TAB_SLUG[tab]}`)
  }, [router])
  const [evalLibraryPickerOpen, setEvalLibraryPickerOpen] = useState(false)
  const [evalLibrarySearch, setEvalLibrarySearch] = useState("")
  const [signalLibraryPickerOpen, setSignalLibraryPickerOpen] = useState(false)
  const [signalLibrarySearch, setSignalLibrarySearch] = useState("")
  const [signalTemplatePickerOpen, setSignalTemplatePickerOpen] = useState(false)
  const [createSignalSheetOpen, setCreateSignalSheetOpen] = useState(false)
  const [selectedSignalTemplate, setSelectedSignalTemplate] = useState<SignalTemplate | null>(null)

  const filteredEvalLibrary = EVALS.filter((e) =>
    !evalLibrarySearch || e.name.toLowerCase().includes(evalLibrarySearch.toLowerCase())
  )
  const filteredSignalLibrary = SIGNALS.filter((s) =>
    !signalLibrarySearch || s.signal.toLowerCase().includes(signalLibrarySearch.toLowerCase())
  )

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Eval library picker */}
      <Dialog open={evalLibraryPickerOpen} onOpenChange={(v) => { setEvalLibraryPickerOpen(v); if (!v) setEvalLibrarySearch("") }}>
        <DialogContent className="max-w-sm p-0 gap-0 overflow-hidden flex flex-col">
          <DialogHeader className="px-5 pt-5 pb-3 space-y-1">
            <DialogTitle className="text-[15px]">Import from library</DialogTitle>
            <DialogDescription className="text-[13px]">Pick an eval to use as a starting point. You&apos;ll get a copy you can edit freely.</DialogDescription>
          </DialogHeader>
          <div className="px-4 pb-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input value={evalLibrarySearch} onChange={(e) => setEvalLibrarySearch(e.target.value)} placeholder="Search…" className="h-8 pl-8 text-[13px]" />
            </div>
          </div>
          <div className="flex flex-col divide-y divide-border overflow-y-auto max-h-72 px-2 pb-3">
            {filteredEvalLibrary.length === 0 ? (
              <p className="py-8 text-center text-[13px] text-muted-foreground">No evals found</p>
            ) : filteredEvalLibrary.map((ev) => (
              <button key={ev.id} type="button" className="flex flex-col gap-0.5 px-3 py-2.5 rounded-md text-left hover:bg-muted/60 transition-colors" onClick={() => setEvalLibraryPickerOpen(false)}>
                <span className="text-[13px] font-medium text-foreground">{ev.name}</span>
                <span className="text-[11px] text-muted-foreground">{ev.type}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Signal library picker */}
      <Dialog open={signalLibraryPickerOpen} onOpenChange={(v) => { setSignalLibraryPickerOpen(v); if (!v) setSignalLibrarySearch("") }}>
        <DialogContent className="max-w-sm p-0 gap-0 overflow-hidden flex flex-col">
          <DialogHeader className="px-5 pt-5 pb-3 space-y-1">
            <DialogTitle className="text-[15px]">Import from library</DialogTitle>
            <DialogDescription className="text-[13px]">Pick a signal to use as a starting point. You&apos;ll get a copy you can edit freely.</DialogDescription>
          </DialogHeader>
          <div className="px-4 pb-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input value={signalLibrarySearch} onChange={(e) => setSignalLibrarySearch(e.target.value)} placeholder="Search…" className="h-8 pl-8 text-[13px]" />
            </div>
          </div>
          <div className="flex flex-col divide-y divide-border overflow-y-auto max-h-72 px-2 pb-3">
            {filteredSignalLibrary.length === 0 ? (
              <p className="py-8 text-center text-[13px] text-muted-foreground">No signals found</p>
            ) : filteredSignalLibrary.map((s) => (
              <button key={s.id} type="button" className="flex flex-col gap-0.5 px-3 py-2.5 rounded-md text-left hover:bg-muted/60 transition-colors" onClick={() => setSignalLibraryPickerOpen(false)}>
                <span className="text-[13px] font-medium text-foreground">{s.signal}</span>
                <span className="text-[11px] text-muted-foreground">{s.type}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Signal template picker + create sheet */}
      <SignalTemplatePicker
        open={signalTemplatePickerOpen}
        onOpenChange={setSignalTemplatePickerOpen}
        onSelect={(t) => { setSelectedSignalTemplate(t); setCreateSignalSheetOpen(true) }}
      />
      <CreateSignalSheet
        open={createSignalSheetOpen}
        onOpenChange={setCreateSignalSheetOpen}
        template={selectedSignalTemplate}
      />

      {/* Page header — align with DashboardLayout navbar styling */}
      <div className="border-b border-border shrink-0">
        <div className="flex lg:grid lg:grid-cols-[1fr_auto_1fr] w-full items-center sm:justify-between px-2 py-1.5 md:px-3">
          <h1 className="text-[15px] font-medium text-foreground">Evaluator</h1>
        </div>
      </div>

      {/* Tabs — exact same pill style as evaluator.tsx inner tabs */}
      <div className="flex items-center justify-between px-6 pb-4 pt-2 shrink-0 bg-[#f7f7f8]">
        <div className="flex items-center gap-0.5 rounded-md border border-border bg-muted p-0.5">
          {INNER_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              className={cn(
                "px-3 py-1 text-[13px] font-medium transition-all rounded-[5px]",
                activeTab === tab
                  ? "bg-white text-foreground shadow-sm dark:bg-background"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {activeTab === "Signals" && (
            <Button size="sm" className="h-8 gap-1.5 text-[13px] bg-foreground text-background hover:bg-foreground/90">
              <Plus className="h-3.5 w-3.5" />New Signal
            </Button>
          )}
          {activeTab === "Evals" && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" className="h-8 gap-1.5 text-[13px] bg-foreground text-background hover:bg-foreground/90">
                  <Plus className="h-3.5 w-3.5" />New Eval<ChevronDown className="h-3.5 w-3.5 opacity-70" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem className="text-[13px] gap-2">
                  <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                  From scratch
                </DropdownMenuItem>
                <DropdownMenuItem className="text-[13px] gap-2" onClick={() => setEvalLibraryPickerOpen(true)}>
                  <CloudDownload className="h-3.5 w-3.5 text-muted-foreground" />
                  Import from library
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Tab content — flex-1, full width */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {activeTab === "Evals" && <EvalsContent />}
        {activeTab === "Signals" && <SignalsContent />}
        {activeTab === "Runs" && <RunsContent />}
      </div>
    </div>
  )
}
