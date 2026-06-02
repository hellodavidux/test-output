"use client"

import React, { useState, useMemo } from "react"
import {
  BarChart2,
  Calendar as CalendarIcon,
  ChevronDown,
  Clock,
  Download,
  Filter,
  RefreshCw,
  Search,
  TrendingUp,
  TrendingDown,
  Users,
  Zap,
  ArrowUpDown,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Cpu,
  DollarSign,
  Activity,
  MoreHorizontal,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts"
import { cn } from "@/lib/utils"

// ─── Mock data ────────────────────────────────────────────────────────────────

const CHART_DATES_30D = Array.from({ length: 30 }, (_, i) => {
  const d = new Date(2026, 3, 1)
  d.setDate(d.getDate() + i)
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
})

const RUNS_OVER_TIME = CHART_DATES_30D.map((date, i) => ({
  date,
  value: Math.round(820 + i * 210 + Math.sin(i * 0.7) * 120),
}))

const USERS_OVER_TIME = CHART_DATES_30D.map((date, i) => ({
  date,
  newUsers: Math.round(4 + Math.sin(i * 0.8) * 3 + (i % 7 === 0 ? 6 : 0)),
  activeUsers: Math.round(38 + i * 2.1 + Math.cos(i * 0.5) * 8),
}))

const TOP_PROJECTS = [
  { id: "p-1", name: "Customer Support Agent", runs: 14820, users: 42, avgLatency: "2.3s", successRate: 97.4, tokens: 6_210_400 },
  { id: "p-2", name: "Email Classification", runs: 9340, users: 18, avgLatency: "0.9s", successRate: 99.1, tokens: 1_870_200 },
  { id: "p-3", name: "Sales Outreach Drafter", runs: 6105, users: 31, avgLatency: "3.1s", successRate: 95.8, tokens: 4_340_500 },
  { id: "p-4", name: "Knowledge Base Q&A", runs: 5890, users: 27, avgLatency: "1.7s", successRate: 98.2, tokens: 2_940_100 },
  { id: "p-5", name: "Code Review Assistant", runs: 3712, users: 14, avgLatency: "4.2s", successRate: 94.3, tokens: 3_120_800 },
  { id: "p-6", name: "Invoice Processor", runs: 2880, users: 9, avgLatency: "1.2s", successRate: 99.6, tokens: 980_400 },
]

const ADOPTION_USERS = [
  { id: "u-1", name: "Sarah Chen", email: "sarah.chen@acme.io", runs: 1840, projects: 4, lastActive: "2 min ago", status: "active" },
  { id: "u-2", name: "Marcus Torres", email: "m.torres@acme.io", runs: 1205, projects: 3, lastActive: "1 hr ago", status: "active" },
  { id: "u-3", name: "Priya Nair", email: "p.nair@acme.io", runs: 980, projects: 5, lastActive: "3 hrs ago", status: "active" },
  { id: "u-4", name: "James Wu", email: "j.wu@acme.io", runs: 741, projects: 2, lastActive: "Yesterday", status: "idle" },
  { id: "u-5", name: "Elena Kovač", email: "e.kovac@acme.io", runs: 634, projects: 3, lastActive: "2 days ago", status: "idle" },
  { id: "u-6", name: "Raj Patel", email: "r.patel@acme.io", runs: 412, projects: 1, lastActive: "5 days ago", status: "inactive" },
  { id: "u-7", name: "Amara Osei", email: "a.osei@acme.io", runs: 308, projects: 2, lastActive: "1 week ago", status: "inactive" },
  { id: "u-8", name: "Tom Huang", email: "t.huang@acme.io", runs: 97, projects: 1, lastActive: "2 weeks ago", status: "inactive" },
]

const MODELS_DATA = [
  { id: "m-1", model: "gpt-4o", provider: "OpenAI", runs: 18204, tokens: 9_820_400, inputTokens: 3_730_000, outputTokens: 6_090_400, cost: 294.72, avgLatency: "2.1s", successRate: 98.4 },
  { id: "m-2", model: "gpt-4o-mini", provider: "OpenAI", runs: 12880, tokens: 3_140_200, inputTokens: 1_180_000, outputTokens: 1_960_200, cost: 18.84, avgLatency: "0.8s", successRate: 99.1 },
  { id: "m-3", model: "claude-sonnet-4-6", provider: "Anthropic", runs: 7340, tokens: 5_402_100, inputTokens: 2_100_000, outputTokens: 3_302_100, cost: 162.06, avgLatency: "3.4s", successRate: 97.8 },
  { id: "m-4", model: "claude-haiku-4-5", provider: "Anthropic", runs: 4120, tokens: 1_280_600, inputTokens: 490_000, outputTokens: 790_600, cost: 5.12, avgLatency: "0.6s", successRate: 99.3 },
  { id: "m-5", model: "gpt-4.1", provider: "OpenAI", runs: 2900, tokens: 2_108_300, inputTokens: 820_000, outputTokens: 1_288_300, cost: 84.33, avgLatency: "2.8s", successRate: 97.2 },
  { id: "m-6", model: "gemini-1.5-pro", provider: "Google", runs: 1380, tokens: 980_400, inputTokens: 370_000, outputTokens: 610_400, cost: 19.61, avgLatency: "1.9s", successRate: 96.5 },
]

const MODEL_TOKENS_CHART = MODELS_DATA.map((m) => ({
  model: m.model,
  input: Math.round(m.inputTokens / 1000),
  output: Math.round(m.outputTokens / 1000),
}))

const LOG_STATUSES = ["success", "error", "running"] as const
type LogStatus = (typeof LOG_STATUSES)[number]

function generateRunLogs() {
  const projects = ["Customer Support Agent", "Email Classification", "Sales Outreach Drafter", "Knowledge Base Q&A", "Code Review Assistant"]
  const models = ["gpt-4o", "gpt-4o-mini", "claude-sonnet-4-6", "claude-haiku-4-5", "gpt-4.1"]
  const users = ["sarah.chen", "m.torres", "p.nair", "j.wu", "e.kovac", "r.patel"]
  const statuses: LogStatus[] = ["success", "success", "success", "success", "success", "error", "running"]

  return Array.from({ length: 80 }, (_, i) => ({
    id: `log-${i}`,
    timestamp: new Date(2026, 3, 30 - Math.floor(i / 4), 23 - (i % 12), (i * 7) % 60).toLocaleString("en-US", {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    }),
    project: projects[i % projects.length]!,
    user: users[i % users.length]! + "@acme.io",
    model: models[i % models.length]!,
    status: statuses[i % statuses.length]!,
    latency: `${(0.5 + (i % 11) * 0.4).toFixed(1)}s`,
    tokens: Math.round(120 + (i % 40) * 180 + Math.sin(i) * 50),
  }))
}

const RUN_LOGS = generateRunLogs()

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtNum(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function StatusBadge({ status }: { status: LogStatus }) {
  if (status === "success") return (
    <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
      <CheckCircle2 className="h-3.5 w-3.5" /> Success
    </span>
  )
  if (status === "error") return (
    <span className="inline-flex items-center gap-1 text-xs text-red-500 dark:text-red-400">
      <XCircle className="h-3.5 w-3.5" /> Error
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
      <AlertCircle className="h-3.5 w-3.5" /> Running
    </span>
  )
}

const TAB_LIST_CLASS =
  "mb-6 inline-flex h-auto w-fit items-center gap-0.5 rounded-md border border-border bg-muted p-0.5"
const TAB_TRIGGER_CLASS =
  "h-auto flex-none px-3 py-1 text-[13px] font-medium rounded-[5px] text-muted-foreground hover:text-foreground data-[state=active]:bg-white data-[state=active]:text-foreground data-[state=active]:shadow-sm dark:data-[state=active]:bg-background"

function MetricCard({
  label,
  value,
  sub,
  trend,
  trendUp,
  icon: Icon,
}: {
  label: string
  value: string
  sub?: string
  trend?: string
  trendUp?: boolean
  icon: React.ElementType
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground font-medium">{label}</span>
        <Icon className="h-4 w-4 text-muted-foreground/60" />
      </div>
      <div className="text-2xl font-semibold tracking-tight">{value}</div>
      {(sub || trend) && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {trend && (
            <span className={cn("flex items-center gap-0.5 font-medium", trendUp ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400")}>
              {trendUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {trend}
            </span>
          )}
          {sub && <span>{sub}</span>}
        </div>
      )}
    </div>
  )
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

function OverviewTab() {
  const [activeMetric, setActiveMetric] = useState<"runs" | "tokens">("runs")

  const chartData = activeMetric === "runs" ? RUNS_OVER_TIME : RUNS_OVER_TIME.map((d) => ({
    ...d,
    value: Math.round(d.value * 340 + Math.sin(parseInt(d.date) || 0) * 5000),
  }))

  return (
    <div className="flex flex-col gap-6">
      {/* Metric cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard label="Total Runs" value="42,747" sub="last 30 days" trend="+18%" trendUp icon={Activity} />
        <MetricCard label="Active Users" value="123" sub="across all projects" trend="+7" trendUp icon={Users} />
        <MetricCard label="Tokens Used" value="22.7M" sub="last 30 days" trend="+24%" trendUp icon={Zap} />
        <MetricCard label="Avg Latency" value="2.1s" sub="across all models" trend="-0.3s" trendUp icon={Clock} />
      </div>

      {/* Chart */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {activeMetric === "runs" ? "Runs over time" : "Tokens over time"}
            </span>
          </div>
          <div className="flex gap-1">
            {(["runs", "tokens"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setActiveMetric(m)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  activeMetric === m
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorMetric" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--foreground))" stopOpacity={0.12} />
                <stop offset="95%" stopColor="hsl(var(--foreground))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
              interval={6}
            />
            <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
            <RechartsTooltip
              contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
              labelStyle={{ fontWeight: 600 }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="hsl(var(--foreground))"
              strokeWidth={1.5}
              fill="url(#colorMetric)"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Top projects table */}
      <div className="rounded-xl border border-border bg-card">
        <div className="px-4 py-3 border-b border-border">
          <span className="text-sm font-medium">Top projects</span>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Project</TableHead>
              <TableHead className="text-xs text-right">Runs</TableHead>
              <TableHead className="text-xs text-right">Users</TableHead>
              <TableHead className="text-xs text-right">Avg latency</TableHead>
              <TableHead className="text-xs text-right">Success rate</TableHead>
              <TableHead className="text-xs text-right">Tokens</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {TOP_PROJECTS.map((p) => (
              <TableRow key={p.id} className="cursor-pointer hover:bg-muted/40">
                <TableCell className="font-medium text-sm">{p.name}</TableCell>
                <TableCell className="text-right text-sm tabular-nums">{fmtNum(p.runs)}</TableCell>
                <TableCell className="text-right text-sm tabular-nums">{p.users}</TableCell>
                <TableCell className="text-right text-sm tabular-nums">{p.avgLatency}</TableCell>
                <TableCell className="text-right">
                  <span className={cn("text-sm tabular-nums font-medium", p.successRate >= 98 ? "text-emerald-600 dark:text-emerald-400" : p.successRate >= 96 ? "text-amber-600 dark:text-amber-400" : "text-red-500")}>
                    {p.successRate}%
                  </span>
                </TableCell>
                <TableCell className="text-right text-sm tabular-nums text-muted-foreground">{fmtNum(p.tokens)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

function AdoptionTab() {
  const [userStatusFilter, setUserStatusFilter] = useState<"all" | "active" | "idle" | "inactive">("all")

  const filteredUsers = useMemo(
    () => userStatusFilter === "all" ? ADOPTION_USERS : ADOPTION_USERS.filter((u) => u.status === userStatusFilter),
    [userStatusFilter]
  )

  return (
    <div className="flex flex-col gap-6">
      {/* Metric cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard label="Total Users" value="123" sub="all time" trend="+7 this month" trendUp icon={Users} />
        <MetricCard label="Active (7d)" value="64" sub="51% of total" trend="+12%" trendUp icon={Activity} />
        <MetricCard label="New Users (30d)" value="18" sub="vs 11 last period" trend="+64%" trendUp icon={TrendingUp} />
        <MetricCard label="Avg Runs / User" value="347" sub="last 30 days" trend="+8%" trendUp icon={BarChart2} />
      </div>

      {/* Users over time chart */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-sm font-medium">User activity over time</span>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full bg-foreground/80" />Active users</span>
            <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full bg-muted-foreground/40" />New users</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={USERS_OVER_TIME} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorActive" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--foreground))" stopOpacity={0.12} />
                <stop offset="95%" stopColor="hsl(var(--foreground))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorNew" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.18} />
                <stop offset="95%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
              interval={6}
            />
            <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
            <RechartsTooltip
              contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
            />
            <Area type="monotone" dataKey="activeUsers" name="Active users" stroke="hsl(var(--foreground))" strokeWidth={1.5} fill="url(#colorActive)" dot={false} />
            <Area type="monotone" dataKey="newUsers" name="New users" stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} fill="url(#colorNew)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Users table */}
      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="text-sm font-medium">Users</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs">
                <Filter className="h-3 w-3" />
                {userStatusFilter === "all" ? "All users" : userStatusFilter.charAt(0).toUpperCase() + userStatusFilter.slice(1)}
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              <DropdownMenuRadioGroup value={userStatusFilter} onValueChange={(v) => setUserStatusFilter(v as typeof userStatusFilter)}>
                <DropdownMenuRadioItem value="all">All users</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="active">Active</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="idle">Idle</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="inactive">Inactive</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">User</TableHead>
              <TableHead className="text-xs text-right">Runs</TableHead>
              <TableHead className="text-xs text-right">Projects</TableHead>
              <TableHead className="text-xs">Last active</TableHead>
              <TableHead className="text-xs">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((u) => (
              <TableRow key={u.id} className="cursor-pointer hover:bg-muted/40">
                <TableCell>
                  <div>
                    <div className="text-sm font-medium">{u.name}</div>
                    <div className="text-xs text-muted-foreground">{u.email}</div>
                  </div>
                </TableCell>
                <TableCell className="text-right text-sm tabular-nums">{fmtNum(u.runs)}</TableCell>
                <TableCell className="text-right text-sm tabular-nums">{u.projects}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{u.lastActive}</TableCell>
                <TableCell>
                  <span className={cn(
                    "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
                    u.status === "active" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400" :
                    u.status === "idle" ? "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400" :
                    "bg-muted text-muted-foreground"
                  )}>
                    {u.status}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

function ModelsTab() {
  const totalCost = MODELS_DATA.reduce((s, m) => s + m.cost, 0)
  const totalRuns = MODELS_DATA.reduce((s, m) => s + m.runs, 0)
  const totalTokens = MODELS_DATA.reduce((s, m) => s + m.tokens, 0)

  return (
    <div className="flex flex-col gap-6">
      {/* Metric cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard label="Models in use" value={String(MODELS_DATA.length)} sub="across all projects" icon={Cpu} />
        <MetricCard label="Total cost" value={`$${totalCost.toFixed(2)}`} sub="last 30 days" trend="+21%" trendUp icon={DollarSign} />
        <MetricCard label="Cost / run" value={`$${(totalCost / totalRuns).toFixed(4)}`} sub="avg across all models" icon={BarChart2} />
        <MetricCard label="Total tokens" value={fmtNum(totalTokens)} sub="last 30 days" trend="+24%" trendUp icon={Zap} />
      </div>

      {/* Token consumption chart */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-sm font-medium">Token consumption by model</span>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-foreground/80" />Input</span>
            <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-muted-foreground/40" />Output</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={MODEL_TOKENS_CHART} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              dataKey="model"
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
            <RechartsTooltip
              contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
              formatter={(v: number) => [`${fmtNum(v * 1000)} tokens`, ""]}
            />
            <Bar dataKey="input" name="Input tokens" stackId="a" fill="hsl(var(--foreground))" opacity={0.8} radius={[0, 0, 0, 0]} />
            <Bar dataKey="output" name="Output tokens" stackId="a" fill="hsl(var(--muted-foreground))" opacity={0.4} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Models table */}
      <div className="rounded-xl border border-border bg-card">
        <div className="px-4 py-3 border-b border-border">
          <span className="text-sm font-medium">Model breakdown</span>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Model</TableHead>
              <TableHead className="text-xs">Provider</TableHead>
              <TableHead className="text-xs text-right">Runs</TableHead>
              <TableHead className="text-xs text-right">Tokens</TableHead>
              <TableHead className="text-xs text-right">Cost</TableHead>
              <TableHead className="text-xs text-right">Avg latency</TableHead>
              <TableHead className="text-xs text-right">Success</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {MODELS_DATA.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="font-mono text-[13px] font-medium">{m.model}</TableCell>
                <TableCell>
                  <span className="text-xs text-muted-foreground">{m.provider}</span>
                </TableCell>
                <TableCell className="text-right text-sm tabular-nums">{fmtNum(m.runs)}</TableCell>
                <TableCell className="text-right text-sm tabular-nums">{fmtNum(m.tokens)}</TableCell>
                <TableCell className="text-right text-sm tabular-nums">${m.cost.toFixed(2)}</TableCell>
                <TableCell className="text-right text-sm tabular-nums">{m.avgLatency}</TableCell>
                <TableCell className="text-right">
                  <span className={cn("text-sm tabular-nums font-medium", m.successRate >= 98 ? "text-emerald-600 dark:text-emerald-400" : m.successRate >= 96 ? "text-amber-600" : "text-red-500")}>
                    {m.successRate}%
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

function RunLogsTab() {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "success" | "error" | "running">("all")
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 15

  const filtered = useMemo(() => {
    let rows = RUN_LOGS
    if (statusFilter !== "all") rows = rows.filter((r) => r.status === statusFilter)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      rows = rows.filter((r) =>
        r.project.toLowerCase().includes(q) ||
        r.user.toLowerCase().includes(q) ||
        r.model.toLowerCase().includes(q)
      )
    }
    return rows
  }, [search, statusFilter])

  const pageCount = Math.ceil(filtered.length / PAGE_SIZE)
  const pageRows = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search project, user, model…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0) }}
            className="pl-8 h-8 text-sm"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
              <Filter className="h-3 w-3" />
              {statusFilter === "all" ? "All statuses" : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-36">
            <DropdownMenuRadioGroup value={statusFilter} onValueChange={(v) => { setStatusFilter(v as typeof statusFilter); setPage(0) }}>
              <DropdownMenuRadioItem value="all">All statuses</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="success">Success</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="error">Error</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="running">Running</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs ml-auto">
          <Download className="h-3 w-3" />
          Export
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Timestamp</TableHead>
              <TableHead className="text-xs">Project</TableHead>
              <TableHead className="text-xs">User</TableHead>
              <TableHead className="text-xs">Model</TableHead>
              <TableHead className="text-xs">Status</TableHead>
              <TableHead className="text-xs text-right">Latency</TableHead>
              <TableHead className="text-xs text-right">Tokens</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                  No runs match the current filters.
                </TableCell>
              </TableRow>
            ) : pageRows.map((r) => (
              <TableRow key={r.id} className="cursor-pointer hover:bg-muted/40">
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{r.timestamp}</TableCell>
                <TableCell className="text-sm max-w-[180px] truncate">{r.project}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{r.user}</TableCell>
                <TableCell className="font-mono text-[12px]">{r.model}</TableCell>
                <TableCell><StatusBadge status={r.status} /></TableCell>
                <TableCell className="text-right text-sm tabular-nums">{r.latency}</TableCell>
                <TableCell className="text-right text-sm tabular-nums">{r.tokens.toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Pagination */}
        {pageCount > 1 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-2">
            <span className="text-xs text-muted-foreground">
              {filtered.length} runs · page {page + 1} of {pageCount}
            </span>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                disabled={page >= pageCount - 1}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

export function OrgAnalytics() {
  const [activeTab, setActiveTab] = useState("overview")

  return (
    <div className="flex h-full flex-col overflow-auto bg-background">
      {/* Page header */}
      <div className="border-b border-border bg-background px-6 py-4 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-lg font-semibold">Analytics</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Organization-wide usage, adoption, and model metrics</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
            <CalendarIcon className="h-3.5 w-3.5" />
            Last 30 days
            <ChevronDown className="h-3 w-3" />
          </Button>
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto px-6 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className={TAB_LIST_CLASS}>
            <TabsTrigger value="overview" className={TAB_TRIGGER_CLASS}>Overview</TabsTrigger>
            <TabsTrigger value="adoption" className={TAB_TRIGGER_CLASS}>Adoption</TabsTrigger>
            <TabsTrigger value="models" className={TAB_TRIGGER_CLASS}>Models</TabsTrigger>
            <TabsTrigger value="run-logs" className={TAB_TRIGGER_CLASS}>Run Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-0">
            <OverviewTab />
          </TabsContent>
          <TabsContent value="adoption" className="mt-0">
            <AdoptionTab />
          </TabsContent>
          <TabsContent value="models" className="mt-0">
            <ModelsTab />
          </TabsContent>
          <TabsContent value="run-logs" className="mt-0">
            <RunLogsTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
