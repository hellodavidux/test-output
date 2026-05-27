"use client"

import React, { useState } from "react"
import {
  AlertCircle,
  ArrowUpDown,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  Filter,
  History,
  ListChecks,
  MoreHorizontal,
  Play,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  Signal,
  Timer,
  Trash2,
  TrendingDown,
  TrendingUp,
  X,
  Zap,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
import { cn } from "@/lib/utils"

// ─── Types ─────────────────────────────────────────────────────────────────

type EvalType = "LLM Judge" | "Regex" | "Expected Output" | "Schema" | "Human Review"
type EvalStatus = "Active" | "Draft" | "Deprecated"
type SignalStatus = "Active" | "Paused" | "Draft"
type RunResult = "Passed" | "Failed" | "Running"

interface EvalDef {
  id: string
  name: string
  type: EvalType
  target: string
  usedIn: string
  version: string
  status: EvalStatus
  lastUpdated: string
  description?: string
  criteria?: string
  threshold?: number
}

interface SignalDef {
  id: string
  signal: string
  source: string
  aggregation: string
  threshold: string
  usedIn: string
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
  { id: "e1", name: "Tone & Helpfulness", type: "LLM Judge", target: "Assistant Output", usedIn: "12 projects", version: "v3", status: "Active", lastUpdated: "2d ago", description: "Evaluates whether the assistant response is helpful, on-topic, and maintains an appropriate professional tone.", criteria: "Score 1–10 on helpfulness (relevance, completeness) and tone (polite, not condescending). Fail if score < 7.", threshold: 7.0 },
  { id: "e2", name: "JSON Structure Match", type: "Schema", target: "Tool Result", usedIn: "4 workflows", version: "v5", status: "Active", lastUpdated: "5d ago", description: "Validates that tool outputs conform to the expected JSON schema.", criteria: "Response must be valid JSON matching the declared schema. Any missing required field = fail.", threshold: 1.0 },
  { id: "e3", name: "Expected Answer Match", type: "Expected Output", target: "Final Response", usedIn: "8 projects", version: "v1", status: "Active", lastUpdated: "1w ago", description: "Compares the model output against a set of expected reference answers using fuzzy matching.", criteria: "Semantic similarity ≥ 0.85 against reference.", threshold: 0.85 },
  { id: "e4", name: "Hallucination Judge", type: "LLM Judge", target: "Entire Trace", usedIn: "6 projects", version: "v2", status: "Active", lastUpdated: "3d ago", description: "Detects factual inaccuracies or fabricated content in the model's response.", criteria: "Pass if no grounding violations detected. Any fabricated fact = fail.", threshold: 0 },
  { id: "e5", name: "Customer Satisfaction", type: "LLM Judge", target: "Assistant Output", usedIn: "3 workflows", version: "v1", status: "Draft", lastUpdated: "2w ago", description: "Estimates likely customer satisfaction score.", criteria: "CSAT proxy score 1–5. Threshold = 4.", threshold: 4.0 },
  { id: "e6", name: "PII Redaction Check", type: "Regex", target: "Final Response", usedIn: "9 projects", version: "v4", status: "Active", lastUpdated: "1d ago", description: "Ensures no PII appears in any model output.", criteria: "Regex pattern matching against known PII formats. Any match = fail.", threshold: 0 },
  { id: "e7", name: "Tool Call Correctness", type: "Schema", target: "Tool Result", usedIn: "5 workflows", version: "v2", status: "Deprecated", lastUpdated: "3w ago", description: "Validates that tool calls are well-formed.", criteria: "Deprecated in favor of JSON Structure Match v5.", threshold: 1.0 },
]

const SIGNALS: SignalDef[] = [
  { id: "s1", signal: "PII Detected", source: "Regex", aggregation: "Per Run", threshold: "= 0", usedIn: "9 projects", status: "Active" },
  { id: "s2", signal: "Latency Spike", source: "Runtime Metrics", aggregation: "P95", threshold: "> 8s", usedIn: "6 workflows", status: "Active" },
  { id: "s3", signal: "Tool Failure Rate", source: "Runtime Metrics", aggregation: "Rolling 1h", threshold: "> 5%", usedIn: "4 projects", status: "Active" },
  { id: "s4", signal: "Escalation Risk", source: "LLM Judge", aggregation: "Per Run", threshold: "> 0.7", usedIn: "3 workflows", status: "Active" },
  { id: "s5", signal: "High Cost Run", source: "Metadata", aggregation: "Per Run", threshold: "> $0.50", usedIn: "7 projects", status: "Paused" },
  { id: "s6", signal: "Low CSAT Proxy", source: "LLM Judge", aggregation: "Daily", threshold: "< 3.5", usedIn: "2 workflows", status: "Draft" },
  { id: "s7", signal: "Context Window Near Limit", source: "Runtime Metrics", aggregation: "Per Run", threshold: "> 90%", usedIn: "5 projects", status: "Active" },
  { id: "s8", signal: "Negative User Feedback", source: "User Feedback", aggregation: "Daily", threshold: "> 10%", usedIn: "4 workflows", status: "Active" },
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

// ─── Shared badge components ────────────────────────────────────────────────

function StatusBadge({ status }: { status: EvalStatus | SignalStatus | RunResult }) {
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
  const styles: Record<EvalType, string> = {
    "LLM Judge": "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-400 dark:border-violet-900",
    "Regex": "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/30 dark:text-sky-400 dark:border-sky-900",
    "Expected Output": "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-900",
    "Schema": "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-900",
    "Human Review": "bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-950/30 dark:text-pink-400 dark:border-pink-900",
  }
  return (
    <Badge className={cn("border font-normal text-[11px] px-1.5 py-px rounded", styles[type] ?? "")}>
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
              <StatusBadge status={evalDef.status} />
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
              <DetailRow label="Status" value={<StatusBadge status={evalDef.status} />} />
              <DetailRow label="Used in" value={evalDef.usedIn} />
              <DetailRow label="Updated" value={evalDef.lastUpdated} />
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
          <DrawerSection label="Recent Performance">
            <div className="grid grid-cols-3 gap-2">
              {[{ label: "Pass rate", value: "94%", trend: "up" }, { label: "Avg score", value: "8.1", trend: "up" }, { label: "Runs (7d)", value: "142", trend: null }].map((m) => (
                <div key={m.label} className="flex flex-col gap-0.5 rounded-md border border-border bg-muted/30 px-2.5 py-2">
                  <div className="flex items-center gap-1">
                    <span className="text-[15px] font-semibold tabular-nums">{m.value}</span>
                    {m.trend === "up" && <TrendingUp className="h-3 w-3 text-emerald-600" />}
                    {m.trend === "down" && <TrendingDown className="h-3 w-3 text-red-500" />}
                  </div>
                  <span className="text-[10px] text-muted-foreground">{m.label}</span>
                </div>
              ))}
            </div>
          </DrawerSection>
          <DrawerSection label="Test Eval">
            <div className="flex flex-col gap-2.5">
              <div className="flex flex-col gap-1">
                <Label className="text-[11px] text-muted-foreground">Input</Label>
                <Textarea value={testInput} onChange={(e) => setTestInput(e.target.value)} placeholder="User message or context…" className="text-[12px] min-h-[60px] resize-none bg-muted/40 border-border/60" rows={3} />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-[11px] text-muted-foreground">Output</Label>
                <Textarea value={testOutput} onChange={(e) => setTestOutput(e.target.value)} placeholder="Model response to evaluate…" className="text-[12px] min-h-[60px] resize-none bg-muted/40 border-border/60" rows={3} />
              </div>
              <Button size="sm" className="h-7 text-[12px] self-start gap-1.5" disabled={!testInput || !testOutput || running} onClick={runTest}>
                {running ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                Run Eval
              </Button>
              {testResult && (
                <div className={cn("rounded-md border p-3 flex flex-col gap-1.5", testResult.pass ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30" : "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30")}>
                  <span className={cn("text-[13px] font-semibold", testResult.pass ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400")}>
                    {testResult.pass ? "✓ Pass" : "✗ Fail"} — Score {testResult.score}
                  </span>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{testResult.rationale}</p>
                </div>
              )}
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
      <div className="flex items-center gap-2 px-6 py-3 border-b border-border">
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
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-[11px]">Status</DropdownMenuLabel>
              {["Active", "Draft", "Deprecated"].map((s) => (
                <DropdownMenuItem key={s} className="text-[12px]">{s}</DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-6 text-[12px] font-medium text-muted-foreground w-[220px]">
                <button className="flex items-center gap-1 hover:text-foreground">Name <ArrowUpDown className="h-3 w-3" /></button>
              </TableHead>
              <TableHead className="text-[12px] font-medium text-muted-foreground">Type</TableHead>
              <TableHead className="text-[12px] font-medium text-muted-foreground hidden lg:table-cell">Target</TableHead>
              <TableHead className="text-[12px] font-medium text-muted-foreground hidden md:table-cell">Used In</TableHead>
              <TableHead className="text-[12px] font-medium text-muted-foreground hidden lg:table-cell w-16">Version</TableHead>
              <TableHead className="text-[12px] font-medium text-muted-foreground">
                <button className="flex items-center gap-1 hover:text-foreground">Status <ArrowUpDown className="h-3 w-3" /></button>
              </TableHead>
              <TableHead className="text-[12px] font-medium text-muted-foreground hidden xl:table-cell">
                <button className="flex items-center gap-1 hover:text-foreground">Last Updated <ArrowUpDown className="h-3 w-3" /></button>
              </TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((e) => (
              <TableRow key={e.id} className="cursor-pointer group" onClick={() => { setSelectedEval(e); setDrawerOpen(true) }}>
                <TableCell className="pl-6">
                  <span className="text-[13px] font-medium text-foreground">{e.name}</span>
                </TableCell>
                <TableCell><TypeBadge type={e.type} /></TableCell>
                <TableCell className="text-[13px] text-muted-foreground hidden lg:table-cell">{e.target}</TableCell>
                <TableCell className="text-[13px] text-muted-foreground hidden md:table-cell">{e.usedIn}</TableCell>
                <TableCell className="hidden lg:table-cell">
                  <code className="text-[11px] font-mono bg-muted px-1.5 py-0.5 rounded">{e.version}</code>
                </TableCell>
                <TableCell><StatusBadge status={e.status} /></TableCell>
                <TableCell className="text-[13px] text-muted-foreground hidden xl:table-cell">{e.lastUpdated}</TableCell>
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
                      <DropdownMenuItem className="text-[12px] text-muted-foreground"><AlertCircle className="h-3.5 w-3.5" />Deprecate</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <EvalDetailsDrawer eval={selectedEval} open={drawerOpen} onOpenChange={setDrawerOpen} />
    </>
  )
}

// ─── Signals Content ─────────────────────────────────────────────────────────

function SignalsContent() {
  const [search, setSearch] = useState("")
  const filtered = SIGNALS.filter((s) =>
    !search || s.signal.toLowerCase().includes(search.toLowerCase()) || s.source.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      <div className="flex items-center gap-2 px-6 py-3 border-b border-border">
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
      <div className="flex-1 overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-6 text-[12px] font-medium text-muted-foreground w-[200px]">Signal</TableHead>
              <TableHead className="text-[12px] font-medium text-muted-foreground">Source</TableHead>
              <TableHead className="text-[12px] font-medium text-muted-foreground hidden md:table-cell">Aggregation</TableHead>
              <TableHead className="text-[12px] font-medium text-muted-foreground hidden md:table-cell">Threshold</TableHead>
              <TableHead className="text-[12px] font-medium text-muted-foreground hidden lg:table-cell">Used In</TableHead>
              <TableHead className="text-[12px] font-medium text-muted-foreground">Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((s) => (
              <TableRow key={s.id} className="group cursor-default">
                <TableCell className="pl-6">
                  <div className="flex items-center gap-2">
                    <Signal className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="text-[13px] font-medium text-foreground">{s.signal}</span>
                  </div>
                </TableCell>
                <TableCell className="text-[13px] text-muted-foreground">{s.source}</TableCell>
                <TableCell className="text-[13px] text-muted-foreground hidden md:table-cell">{s.aggregation}</TableCell>
                <TableCell className="hidden md:table-cell">
                  <code className="text-[11px] font-mono bg-muted px-1.5 py-0.5 rounded">{s.threshold}</code>
                </TableCell>
                <TableCell className="text-[13px] text-muted-foreground hidden lg:table-cell">{s.usedIn}</TableCell>
                <TableCell><StatusBadge status={s.status} /></TableCell>
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
      </div>
    </>
  )
}

// ─── Runs Content ────────────────────────────────────────────────────────────

function RunsContent() {
  const [search, setSearch] = useState("")
  const [failedOnly, setFailedOnly] = useState(false)
  const [timeRange, setTimeRange] = useState("24h")
  const [selectedRun, setSelectedRun] = useState<RunRow | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const filtered = RUNS.filter((r) => {
    const matchSearch = !search || r.id.toLowerCase().includes(search.toLowerCase()) || r.project.toLowerCase().includes(search.toLowerCase())
    return matchSearch && (!failedOnly || r.result === "Failed")
  })

  return (
    <>
      <div className="flex items-center gap-2 px-6 py-3 border-b border-border flex-wrap">
        <div className="relative w-56">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search runs, projects…" className="h-8 pl-8 text-[13px] bg-transparent border-0 rounded-none focus-visible:ring-0 px-8 placeholder:text-muted-foreground" />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-[13px]">
                Production<ChevronDown className="h-3.5 w-3.5 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              <DropdownMenuLabel className="text-[11px]">Environment</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {["Production", "Staging", "Development"].map((e) => <DropdownMenuItem key={e} className="text-[12px]">{e}</DropdownMenuItem>)}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-[13px]">
                <Clock className="h-3.5 w-3.5" />Last {timeRange}<ChevronDown className="h-3.5 w-3.5 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              <DropdownMenuLabel className="text-[11px]">Time range</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup value={timeRange} onValueChange={setTimeRange}>
                {["1h", "6h", "24h", "7d", "30d"].map((t) => <DropdownMenuRadioItem key={t} value={t} className="text-[12px]">Last {t}</DropdownMenuRadioItem>)}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            onClick={() => setFailedOnly((v) => !v)}
            className={cn("flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[13px] transition-colors h-8", failedOnly ? "border-red-300 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400" : "border-border bg-background text-muted-foreground hover:bg-muted/60")}
          >
            <AlertCircle className="h-3.5 w-3.5" />Failed only
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-6 text-[12px] font-medium text-muted-foreground w-28">Run ID</TableHead>
              <TableHead className="text-[12px] font-medium text-muted-foreground hidden md:table-cell">Project</TableHead>
              <TableHead className="text-[12px] font-medium text-muted-foreground hidden lg:table-cell">Workflow</TableHead>
              <TableHead className="text-[12px] font-medium text-muted-foreground hidden xl:table-cell">Eval Set</TableHead>
              <TableHead className="text-[12px] font-medium text-muted-foreground">Result</TableHead>
              <TableHead className="text-[12px] font-medium text-muted-foreground hidden md:table-cell">Duration</TableHead>
              <TableHead className="text-[12px] font-medium text-muted-foreground hidden lg:table-cell">Cost</TableHead>
              <TableHead className="text-[12px] font-medium text-muted-foreground">
                <button className="flex items-center gap-1 hover:text-foreground">Timestamp <ArrowUpDown className="h-3 w-3" /></button>
              </TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((r) => (
              <TableRow key={r.id} className="cursor-pointer group" onClick={() => { setSelectedRun(r); setDrawerOpen(true) }}>
                <TableCell className="pl-6"><code className="text-[12px] font-mono text-foreground">{r.id}</code></TableCell>
                <TableCell className="text-[13px] text-muted-foreground hidden md:table-cell">{r.project}</TableCell>
                <TableCell className="text-[13px] text-muted-foreground hidden lg:table-cell">{r.workflow}</TableCell>
                <TableCell className="text-[13px] text-muted-foreground hidden xl:table-cell max-w-[200px] truncate">{r.evalSet}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    {r.result === "Running" && <RefreshCw className="h-3 w-3 animate-spin text-blue-500" />}
                    <StatusBadge status={r.result} />
                  </div>
                </TableCell>
                <TableCell className="text-[13px] text-muted-foreground hidden md:table-cell font-mono">{r.duration}</TableCell>
                <TableCell className="text-[13px] text-muted-foreground hidden lg:table-cell font-mono">{r.cost}</TableCell>
                <TableCell className="text-[13px] text-muted-foreground">{r.timestamp}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <RunDetailsDrawer run={selectedRun} open={drawerOpen} onOpenChange={setDrawerOpen} />
    </>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function OrgEvaluator() {
  const [activeTab, setActiveTab] = useState<InnerTab>("Evals")

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Page header — matches Knowledge Bases layout exactly */}
      <div className="flex items-center justify-between px-6 py-4 shrink-0">
        <h1 className="text-[15px] font-semibold text-foreground">Evaluator</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-[13px]">
            <Plus className="h-3.5 w-3.5" />New Signal
          </Button>
          <Button size="sm" className="h-8 gap-1.5 text-[13px] bg-foreground text-background hover:bg-foreground/90">
            <Plus className="h-3.5 w-3.5" />New Eval
          </Button>
        </div>
      </div>

      {/* Tabs — exact same pill style as evaluator.tsx inner tabs */}
      <div className="flex items-center px-6 pb-4 shrink-0">
        <div className="flex items-center gap-0.5 rounded-md border border-border bg-muted p-0.5">
          {INNER_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
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
      </div>

      {/* Tab content — flex-1, full width */}
      <div className="flex flex-col flex-1 overflow-hidden border-t border-border">
        {activeTab === "Evals" && <EvalsContent />}
        {activeTab === "Signals" && <SignalsContent />}
        {activeTab === "Runs" && <RunsContent />}
      </div>
    </div>
  )
}
