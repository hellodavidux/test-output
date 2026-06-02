"use client"

import React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Activity,
  BarChart,
  Bell,
  BotIcon,
  ChartNoAxesColumnIncreasingIcon,
  DatabaseIcon,
  FolderIcon,
  GitBranchIcon,
  GlobeIcon,
  HelpCircle,
  Home,
  LayoutGridIcon,
  ListChecks,
  PanelLeftClose,
  PanelLeftOpen,
  PenBoxIcon,
  Play,
  Plus,
  Search,
  SearchCheckIcon,
  UnplugIcon,
  Wand2,
  WorkflowIcon,
} from "lucide-react"
import Image from "next/image"
import { motion } from "motion/react"

import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Sidebar,
  SidebarButton,
  SidebarButtonGroup,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import { buildExperimentSeedFromPrefill, type ExperimentRunSeed } from "@/lib/experiment-run-seed"
import { INITIAL_ANALYTICS_RUNS, type RunData } from "@/lib/analytics-runs"
import type { RunEvaluationSummary } from "@/lib/evaluate-run-presets"
import type { SelectedAction } from "@/lib/types"
import { Analytics } from "@/components/analytics"
import { Evaluator } from "@/components/evaluator"
import { AskAiPanel } from "@/components/ask-ai-panel"

export const TabContext = React.createContext<{
  setActiveTab: (tab: string) => void
  setResetAnalyticsKey?: React.Dispatch<React.SetStateAction<number>>
  /** Opens Analytics on Run Details for the given workflow run id (must exist in the runs table). */
  openAnalyticsRunDetailForRun: (runId: string) => void
  /** Opens Evaluator → Experiment with one test case row seeded from this workflow run. */
  openExperimentWithRun: (payload: {
    runId: string
    /** Fills the Input column (e.g. workflow trigger message). */
    caseInput?: string
    caseExpected?: string
    /** When true, opens the Workflow variant drawer (Run progress → Compare). */
    openWorkflowVariantDrawer?: boolean
  }) => void
  /** Opens Analytics → empty fork run detail with the fork configuration drawer. */
  openAnalyticsForkDraft: (payload: { runId: string; caseInput?: string }) => void
  /** Appends a row to the Analytics overview runs table (Experiment / completed Fork). */
  appendAnalyticsRun: (run: RunData) => void
  /** True while the user is on Workflow editing a graph to add as an experiment variant column (no Run progress). */
  workflowVariantEditSessionActive: boolean
  /** Experiment → Add variant: go to Workflow in variant-edit mode. */
  startWorkflowVariantEditFromExperiment: () => void
  /** Workflow top bar: save column and return to Evaluator. */
  completeWorkflowVariantToExperiment: () => void
  /** Abandon variant edit and return to Evaluator without adding a column. */
  cancelWorkflowVariantEditFromExperiment: () => void
  /** Opens Evaluator → Experiment with the "Add variant column" intro modal (optional matrix row from a run). */
  openExperimentVariantBuilderIntro: (opts?: {
    seedFromRun?: { runId: string; caseInput?: string; caseExpected?: string }
  }) => void
  /** Workflow Run progress ⋯: switch to Analytics and open the Evaluate run dialog for this run id. */
  openEvaluateRunFromWorkflow: (runId: string) => void
  /** Persist a completed "Run evaluation" result so Run Details shows it (Workflow modal + Analytics). */
  applyRunEvaluationOverride: (runId: string, summary: RunEvaluationSummary) => void
  /** Open Evaluator directly on Dataset tab (optionally with a dataset name to auto-open). */
  openEvaluatorDataset: (payload?: { datasetName?: string }) => void
} | null>(null)

interface DashboardLayoutProps {
  children: React.ReactNode
  onActionSelect?: (action: SelectedAction) => void
  onRun?: () => void
}

const TAB_SLUGS: Record<string, string> = {
  Workflow: "workflow",
  Export: "export",
  Analytics: "analytics",
  Evaluator: "evaluator",
}
const SLUG_TO_TAB: Record<string, string> = Object.fromEntries(
  Object.entries(TAB_SLUGS).map(([k, v]) => [v, k])
)

const NAV_TABS = [
  { key: "Workflow", label: "Workflow", Icon: WorkflowIcon },
  { key: "Export", label: "Export", Icon: LayoutGridIcon },
  { key: "Analytics", label: "Analytics", Icon: ChartNoAxesColumnIncreasingIcon },
  { key: "Evaluator", label: "Evaluator", Icon: SearchCheckIcon },
] as const

export function DashboardLayout({ children, onActionSelect, onRun }: DashboardLayoutProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tabFromUrl = SLUG_TO_TAB[searchParams.get("tab") ?? ""] ?? "Workflow"
  const [activeTab, setActiveTabState] = React.useState(tabFromUrl)
  const [sidebarHovered, setSidebarHovered] = React.useState(false)
  const [isSidebarPinned, setIsSidebarPinned] = React.useState(false)
  const [resetAnalyticsKey, setResetAnalyticsKey] = React.useState(0)
  const [pendingOpenRunId, setPendingOpenRunId] = React.useState<string | null>(null)
  const [pendingEvaluateRunId, setPendingEvaluateRunId] = React.useState<string | null>(null)
  const [pendingOpenDatasetName, setPendingOpenDatasetName] = React.useState<string | null>(null)
  const [experimentSeedFromRun, setExperimentSeedFromRun] = React.useState<ExperimentRunSeed | null>(null)
  const [pendingForkFromRun, setPendingForkFromRun] = React.useState<{
    runId: string
    caseInput?: string
  } | null>(null)
  const [askAiOpen, setAskAiOpen] = React.useState(false)
  const [analyticsRuns, setAnalyticsRuns] = React.useState<RunData[]>(() => [...INITIAL_ANALYTICS_RUNS])
  const [workflowVariantEditSession, setWorkflowVariantEditSession] = React.useState(false)
  const [variantAppendToken, setVariantAppendToken] = React.useState<string | null>(null)
  const [variantBuilderIntroToken, setVariantBuilderIntroToken] = React.useState<string | null>(null)
  const [publishMenuOpen, setPublishMenuOpen] = React.useState(false)
  const [runEvaluationOverrides, setRunEvaluationOverrides] = React.useState<
    Record<string, RunEvaluationSummary>
  >({})

  const isSidebarExpanded = sidebarHovered || isSidebarPinned

  const applyRunEvaluationOverride = React.useCallback((runId: string, summary: RunEvaluationSummary) => {
    setRunEvaluationOverrides((prev) => ({ ...prev, [runId]: summary }))
  }, [])

  const appendAnalyticsRun = React.useCallback((run: RunData) => {
    setAnalyticsRuns((prev) => [...prev, run])
  }, [])

  React.useEffect(() => {
    if (activeTab !== "Analytics" && activeTab !== "Evaluator") {
      setAskAiOpen(false)
    }
  }, [activeTab])

  React.useEffect(() => {
    setActiveTabState(tabFromUrl)
  }, [tabFromUrl])

  const setActiveTab = React.useCallback((tab: string) => {
    setActiveTabState(tab)
    const slug = TAB_SLUGS[tab] ?? "workflow"
    router.push(`?tab=${slug}`, { scroll: false })
  }, [router])

  const openExperimentWithRun = React.useCallback(
    (payload: {
      runId: string
      caseInput?: string
      caseExpected?: string
      openWorkflowVariantDrawer?: boolean
    }) => {
      setExperimentSeedFromRun(buildExperimentSeedFromPrefill(payload))
      setActiveTab("Evaluator")
    },
    [setActiveTab],
  )

  const openAnalyticsForkDraft = React.useCallback(
    (payload: { runId: string; caseInput?: string }) => {
      setPendingForkFromRun({ runId: payload.runId, caseInput: payload.caseInput })
      setActiveTab("Analytics")
    },
    [setActiveTab],
  )

  const openAnalyticsRunDetailForRun = React.useCallback(
    (runId: string) => {
      setPendingOpenRunId(runId)
      setActiveTab("Analytics")
    },
    [setActiveTab],
  )

  const startWorkflowVariantEditFromExperiment = React.useCallback(() => {
    setWorkflowVariantEditSession(true)
    setActiveTab("Workflow")
  }, [setActiveTab])

  const completeWorkflowVariantToExperiment = React.useCallback(() => {
    setWorkflowVariantEditSession(false)
    setVariantAppendToken(
      typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `v-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    )
    setActiveTab("Evaluator")
  }, [setActiveTab])

  const clearVariantAppendToken = React.useCallback(() => setVariantAppendToken(null), [])
  const clearVariantBuilderIntroToken = React.useCallback(() => setVariantBuilderIntroToken(null), [])

  const openExperimentVariantBuilderIntro = React.useCallback(
    (opts?: { seedFromRun?: { runId: string; caseInput?: string; caseExpected?: string } }) => {
      if (opts?.seedFromRun) {
        setExperimentSeedFromRun(
          buildExperimentSeedFromPrefill({
            runId: opts.seedFromRun.runId,
            caseInput: opts.seedFromRun.caseInput,
            caseExpected: opts.seedFromRun.caseExpected,
          }),
        )
      } else {
        setExperimentSeedFromRun(null)
      }
      setVariantBuilderIntroToken(
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `intro-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      )
      setActiveTab("Evaluator")
    },
    [setActiveTab],
  )

  const cancelWorkflowVariantEditFromExperiment = React.useCallback(() => {
    setWorkflowVariantEditSession(false)
    setActiveTab("Evaluator")
  }, [setActiveTab])

  React.useEffect(() => {
    if (!workflowVariantEditSession) return
    if (activeTab !== "Workflow") setWorkflowVariantEditSession(false)
  }, [activeTab, workflowVariantEditSession])

  const clearPendingOpenRunId = React.useCallback(() => setPendingOpenRunId(null), [])
  const clearPendingEvaluateRunId = React.useCallback(() => setPendingEvaluateRunId(null), [])
  const clearPendingOpenDatasetName = React.useCallback(() => setPendingOpenDatasetName(null), [])

  const openEvaluateRunFromWorkflow = React.useCallback((runId: string) => {
    setPendingEvaluateRunId(runId)
    setActiveTab("Analytics")
  }, [setActiveTab])

  const openEvaluatorDataset = React.useCallback((payload?: { datasetName?: string }) => {
    const datasetName = payload?.datasetName?.trim() ?? ""
    setPendingOpenDatasetName(datasetName.length > 0 ? datasetName : null)
    setActiveTab("Evaluator")
  }, [setActiveTab])

  const clearPendingForkFromRun = React.useCallback(() => setPendingForkFromRun(null), [])

  // ─── Sidebar nav items (matching production your-data-sidebar.tsx) ────────
  const navItems = [
    { key: "search", label: "Search", Icon: Search, onSelect: () => {} },
    { key: "projects", label: "Projects", Icon: Home, onSelect: () => {} },
    { key: "data", label: "Data", Icon: DatabaseIcon, onSelect: () => {} },
    { key: "connections", label: "Connections", Icon: UnplugIcon, onSelect: () => {} },
    { key: "prompts", label: "Prompts", Icon: PenBoxIcon, onSelect: () => {} },
    { key: "environments", label: "Environments", Icon: GlobeIcon, onSelect: () => {} },
    { key: "pull-requests", label: "Pull Requests", Icon: GitBranchIcon, onSelect: () => {} },
    {
      key: "analytics",
      label: "Analytics",
      Icon: BarChart,
      onSelect: () => router.push("/analytics"),
    },
    {
      key: "org-evaluator",
      label: "Evaluator",
      Icon: ListChecks,
      onSelect: () => router.push("/org-evaluator"),
    },
    { key: "ai-agents", label: "AI Agents", Icon: BotIcon, onSelect: () => {} },
  ]

  const footerItems = [
    { key: "notifications", label: "Notifications", Icon: Bell, dot: "bg-blue-500" },
    { key: "help", label: "Help & More", Icon: HelpCircle },
    { key: "status", label: "System Status", Icon: Activity, dot: "bg-emerald-500" },
  ]

  const mainSection = (
    <>
      {/* ── Top Bar (production ProjectToolbar layout) ──────────────────── */}
      <nav className="border-b border-border flex shrink-0">
        <div className="flex lg:grid lg:grid-cols-[1fr_auto_1fr] w-full items-center sm:justify-between px-2 py-1.5 md:px-3">
          {/* Left: folder / project breadcrumb */}
          <div className="flex items-center gap-2 text-[13px] min-w-0 overflow-hidden">
            <div className="hidden items-center gap-1 xl:flex min-w-0 shrink text-muted-foreground">
              <FolderIcon className="size-[18px] shrink-0 stroke-[1.75]" />
              <span className="truncate">Antlio Testing</span>
            </div>
            <span className="hidden text-xs text-muted-foreground/40 shrink-0 xl:block" aria-hidden="true">/</span>
            <span className="hidden truncate sm:block min-w-0 font-medium">Sidebar</span>
          </div>

          {/* Center: animated tab pills (production Tabs component style) */}
          <div className="flex gap-0.5 bg-muted rounded-md px-0.5 py-0.5 w-fit shrink-0 max-w-full justify-self-center select-none items-center">
            {NAV_TABS.map(({ key, label, Icon }) => {
              const isActive = activeTab === key
              return (
                <div key={key} className="relative flex shrink-0 items-center text-[13px] font-normal">
                  {isActive && (
                    <motion.span
                      layoutId="toolbar-bubble"
                      className="absolute inset-0 rounded-[5px] bg-card shadow-sm"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      if (key === "Analytics") setResetAnalyticsKey((k) => k + 1)
                      setActiveTab(key)
                    }}
                    className={cn(
                      "relative z-[1] flex flex-1 select-none items-center min-w-8 gap-1 px-2 py-1 hover:bg-foreground/5 rounded-[5px] transition",
                      isActive ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    <Icon className="xl:hidden size-3.5 shrink-0" />
                    <span className="hidden xl:inline whitespace-nowrap">{label}</span>
                  </button>
                </div>
              )
            })}
          </div>

          {/* Right: action buttons */}
          <div className="flex items-center gap-2 justify-self-end">
            {activeTab === "Analytics" || activeTab === "Evaluator" ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={cn(
                  "h-8 gap-1.5 border-border bg-background shadow-sm",
                  askAiOpen && "border-foreground/25 bg-muted text-foreground hover:bg-muted/80"
                )}
                onClick={() => setAskAiOpen((v) => !v)}
              >
                <Wand2 className="h-3.5 w-3.5" />
                Ask AI
              </Button>
            ) : activeTab === "Workflow" && workflowVariantEditSession ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5"
                  onClick={cancelWorkflowVariantEditFromExperiment}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  className="h-8 bg-foreground text-background hover:bg-foreground/90"
                  onClick={completeWorkflowVariantToExperiment}
                >
                  Create variant
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={onRun}>
                  <Play className="h-3.5 w-3.5" />
                  Run
                </Button>
                <Popover open={publishMenuOpen} onOpenChange={setPublishMenuOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="default"
                      size="sm"
                      className="h-8 bg-foreground text-background hover:bg-foreground/90"
                    >
                      Publish
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    align="end"
                    side="bottom"
                    sideOffset={8}
                    className="w-[min(100vw-2rem,18rem)] overflow-hidden rounded-lg border-border p-0 shadow-lg"
                  >
                    <div className="border-b border-border bg-muted/80 px-3 py-2.5 text-xs text-muted-foreground">
                      Last published version yesterday
                    </div>
                    <div className="bg-background p-1">
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                      >
                        <Plus className="size-4 shrink-0 opacity-70" strokeWidth={1.75} />
                        Add description
                      </button>
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                      >
                        <GitBranchIcon className="size-4 shrink-0 opacity-70" strokeWidth={1.75} />
                        Review changes
                      </button>
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                        onClick={() => {
                          setPublishMenuOpen(false)
                          setActiveTab("Evaluator")
                        }}
                      >
                        <ListChecks className="size-4 shrink-0 opacity-70" strokeWidth={1.75} />
                        Evaluate changes
                      </button>
                      <div className="border-t border-border p-2">
                        <Button
                          type="button"
                          className="h-10 w-full rounded-md bg-foreground text-sm font-semibold text-background hover:bg-foreground/90"
                          onClick={() => setPublishMenuOpen(false)}
                        >
                          Publish Version
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── Main Content Area ────────────────────────────────────────────── */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* ── Left Sidebar (production Sidebar component) ─────────────── */}
        <div
          className={cn(
            "relative h-full transition-[min-width,max-width] duration-200",
            isSidebarPinned ? "min-w-[220px] max-w-[220px]" : "min-w-12 max-w-12",
          )}
          onMouseEnter={() => setSidebarHovered(true)}
          onMouseLeave={() => setSidebarHovered(false)}
        >
          <Sidebar
            collapsible
            collapsed={!isSidebarExpanded}
            width={220}
            className={cn(
              "absolute inset-y-0 z-50 flex min-h-0 flex-col overflow-hidden border-r bg-background transition-all",
              isSidebarExpanded && !isSidebarPinned && "shadow-[2px_0_8px_-2px_rgba(0,0,0,0.08)]",
            )}
          >
            <div className="flex h-full min-h-0 flex-col px-2 transition-all">
              {/* Header: StackAI logo + pin toggle */}
              <SidebarHeader
                className={cn("mt-2 flex flex-col", isSidebarExpanded ? "items-start" : "items-center")}
              >
                <div
                  className={cn(
                    "flex min-h-8 w-full shrink-0 items-center",
                    isSidebarExpanded ? "justify-between pl-1.5" : "justify-center",
                  )}
                >
                  {/* Logo */}
                  <div className="flex items-center gap-1.5">
                    <Image
                      src="/stack-logo/stack-ai-logo-redesign/icon-dark-no-bg.svg"
                      className="size-5 flex-shrink-0 cursor-pointer"
                      alt="Stack AI"
                      width={20}
                      height={20}
                      priority
                    />
                    {isSidebarExpanded && (
                      <Image
                        src="/stack-logo/stack-ai-logo-redesign/logo-text-dark.svg"
                        className="shrink-0 cursor-pointer"
                        alt="Stack AI"
                        width={56}
                        height={18}
                        priority
                      />
                    )}
                  </div>
                  {/* Pin/unpin button (only shown when expanded) */}
                  {isSidebarExpanded && (
                    <TooltipProvider delayDuration={250}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            onClick={() => setIsSidebarPinned((p) => !p)}
                          >
                            {isSidebarPinned
                              ? <PanelLeftClose className="size-4" />
                              : <PanelLeftOpen className="size-4" />}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent align="end">
                          {isSidebarPinned ? "Unpin sidebar" : "Pin sidebar"}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>

                {/* Org switcher row */}
                <div className="w-full mt-4 mb-1">
                  <SidebarButton
                    className="pl-2 pr-1"
                    tooltip="Antlio Testing"
                    tooltipDisabled={isSidebarExpanded}
                  >
                    <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-foreground/10 text-[9px] font-bold text-foreground">
                      A
                    </div>
                    {isSidebarExpanded && (
                      <span className="min-w-max flex-grow truncate text-[13px] font-medium">Antlio Testing</span>
                    )}
                  </SidebarButton>
                </div>
              </SidebarHeader>

              {/* Nav items */}
              <SidebarContent className="overflow-y-auto">
                <SidebarButtonGroup className="pt-1">
                  {navItems.map(({ key, label, Icon, onSelect }) => (
                    <SidebarButton
                      key={key}
                      className="pl-2 pr-1"
                      isActive={
                        key === "analytics" && activeTab === "Analytics"
                      }
                      tooltip={label}
                      tooltipDisabled={isSidebarExpanded}
                      onClick={onSelect}
                    >
                      <Icon />
                      {isSidebarExpanded && <span className="min-w-max flex-grow">{label}</span>}
                    </SidebarButton>
                  ))}
                </SidebarButtonGroup>
              </SidebarContent>

              {/* Footer items */}
              <SidebarFooter className="relative flex flex-col gap-0.5 pb-4 bg-background">
                <div className="pointer-events-none absolute bottom-full h-10 w-full bg-gradient-to-t from-background" />

                {footerItems.map(({ key, label, Icon, dot }) => (
                  <SidebarButton
                    key={key}
                    className="pl-2 pr-1"
                    tooltip={label}
                    tooltipDisabled={isSidebarExpanded}
                  >
                    <span className="relative flex items-center justify-center size-4">
                      <Icon className="size-4" />
                      {dot && (
                        <span
                          className={cn(
                            "absolute -right-0.5 -top-0.5 h-[5px] w-[5px] rounded-full ring-1 ring-white",
                            dot,
                          )}
                        />
                      )}
                    </span>
                    {isSidebarExpanded && <span className="min-w-max flex-grow">{label}</span>}
                  </SidebarButton>
                ))}

                {/* Profile button */}
                <SidebarButton
                  className="mt-1 pl-2 pr-1"
                  tooltip="Profile"
                  tooltipDisabled={isSidebarExpanded}
                >
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-foreground/10 text-[10px] font-semibold text-foreground">
                    D
                  </div>
                  {isSidebarExpanded && (
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-[13px] font-medium leading-tight">David Hidalgo</span>
                      <span className="truncate text-[11px] text-muted-foreground leading-tight">dhidalgo@stack-ai.com</span>
                    </div>
                  )}
                </SidebarButton>
              </SidebarFooter>
            </div>
          </Sidebar>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 overflow-hidden relative">
          {activeTab === "Analytics" ? (
            <Analytics
              key={resetAnalyticsKey}
              onSwitchToWorkflow={() => setActiveTab("Workflow")}
              onFixWithAi={() => setAskAiOpen(true)}
              pendingForkFromRun={pendingForkFromRun}
              onPendingForkConsumed={clearPendingForkFromRun}
              pendingOpenRunId={pendingOpenRunId}
              onPendingOpenRunConsumed={clearPendingOpenRunId}
              pendingEvaluateRunId={pendingEvaluateRunId}
              onPendingEvaluateRunConsumed={clearPendingEvaluateRunId}
              runs={analyticsRuns}
              onAppendRun={appendAnalyticsRun}
              evaluationOverrides={runEvaluationOverrides}
              onApplyEvalOverride={applyRunEvaluationOverride}
            />
          ) : activeTab === "Evaluator" ? (
            <Evaluator
              experimentSeedFromRun={experimentSeedFromRun}
              onNavigateToWorkflow={() => setActiveTab("Workflow")}
              variantAppendToken={variantAppendToken}
              onVariantAppendConsumed={clearVariantAppendToken}
              variantBuilderIntroToken={variantBuilderIntroToken}
              onVariantBuilderIntroConsumed={clearVariantBuilderIntroToken}
              pendingOpenDatasetName={pendingOpenDatasetName}
              onPendingOpenDatasetConsumed={clearPendingOpenDatasetName}
            />
          ) : activeTab === "Export" ? (
            <div className="h-full w-full bg-background" aria-label="Export" />
          ) : (
            children
          )}
        </div>
      </div>
    </>
  )

  return (
    <TabContext.Provider
      value={{
        setActiveTab,
        setResetAnalyticsKey,
        openAnalyticsRunDetailForRun,
        openExperimentWithRun,
        openAnalyticsForkDraft,
        appendAnalyticsRun,
        workflowVariantEditSessionActive: workflowVariantEditSession,
        startWorkflowVariantEditFromExperiment,
        completeWorkflowVariantToExperiment,
        cancelWorkflowVariantEditFromExperiment,
        openExperimentVariantBuilderIntro,
        openEvaluateRunFromWorkflow,
        applyRunEvaluationOverride,
        openEvaluatorDataset,
      }}
    >
      <div
        className={cn(
          "flex h-screen w-screen flex-col overflow-hidden",
          askAiOpen ? "bg-[#f4f4f5] p-4" : "bg-background"
        )}
      >
        {askAiOpen ? (
          <div className="flex min-h-0 flex-1 gap-0">
            <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-background shadow-sm">
              {mainSection}
            </div>
            <AskAiPanel onClose={() => setAskAiOpen(false)} />
          </div>
        ) : (
          mainSection
        )}
      </div>
    </TabContext.Provider>
  )
}
