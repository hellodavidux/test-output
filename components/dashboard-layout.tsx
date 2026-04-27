"use client"

import React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Activity,
  BarChart3,
  Bell,
  Bot,
  Database,
  GitBranch,
  Globe,
  HelpCircle,
  Home,
  Play,
  Plug,
  Plus,
  Search,
  SquarePen,
  Wand2,
} from "lucide-react"

const sidebarIconBtn =
  "flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
const sidebarIconBtnActive = "bg-neutral-100 text-neutral-900"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
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
  /** Opens Evaluator → Experiment with the “Add variant column” intro modal (optional matrix row from a run). */
  openExperimentVariantBuilderIntro: (opts?: {
    seedFromRun?: { runId: string; caseInput?: string; caseExpected?: string }
  }) => void
  /** Workflow Run progress ⋯: switch to Analytics and open the Evaluate run dialog for this run id. */
  openEvaluateRunFromWorkflow: (runId: string) => void
  /** Persist a completed “Run evaluation” result so Run Details shows it (Workflow modal + Analytics). */
  applyRunEvaluationOverride: (runId: string, summary: RunEvaluationSummary) => void
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

export function DashboardLayout({ children, onActionSelect, onRun }: DashboardLayoutProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tabFromUrl = SLUG_TO_TAB[searchParams.get("tab") ?? ""] ?? "Workflow"
  const [activeTab, setActiveTabState] = React.useState(tabFromUrl)
  const [resetAnalyticsKey, setResetAnalyticsKey] = React.useState(0)
  const [pendingOpenRunId, setPendingOpenRunId] = React.useState<string | null>(null)
  /** Run progress ⋯ → Evaluate Run: Analytics opens the evaluator picker dialog once mounted. */
  const [pendingEvaluateRunId, setPendingEvaluateRunId] = React.useState<string | null>(null)
  /** Persists in layout so Experiment keeps the seeded row after Evaluator remounts (Evaluate / Compare from Run progress). */
  const [experimentSeedFromRun, setExperimentSeedFromRun] = React.useState<ExperimentRunSeed | null>(null)
  /** Handed to Analytics once to open fork draft + drawer (Run progress / table Fork). */
  const [pendingForkFromRun, setPendingForkFromRun] = React.useState<{
    runId: string
    caseInput?: string
  } | null>(null)
  const [askAiOpen, setAskAiOpen] = React.useState(false)
  const [analyticsRuns, setAnalyticsRuns] = React.useState<RunData[]>(() => [...INITIAL_ANALYTICS_RUNS])
  /** Experiment “Add variant” flow: Workflow tab hides Run progress; top bar shows Create variant. */
  const [workflowVariantEditSession, setWorkflowVariantEditSession] = React.useState(false)
  /** One-shot token when user clicks Create variant; Evaluator consumes and clears (survives Evaluator remount). */
  const [variantAppendToken, setVariantAppendToken] = React.useState<string | null>(null)
  /** One-shot token to open the variant-builder intro modal from Run progress / Analytics / etc. */
  const [variantBuilderIntroToken, setVariantBuilderIntroToken] = React.useState<string | null>(null)
  const [publishMenuOpen, setPublishMenuOpen] = React.useState(false)
  const [runEvaluatorOnPublish, setRunEvaluatorOnPublish] = React.useState(true)
  const [runEvaluationOverrides, setRunEvaluationOverrides] = React.useState<
    Record<string, RunEvaluationSummary>
  >({})

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

  // Keep state in sync when URL changes (e.g. back/forward)
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

  const clearVariantAppendToken = React.useCallback(() => {
    setVariantAppendToken(null)
  }, [])

  const clearVariantBuilderIntroToken = React.useCallback(() => {
    setVariantBuilderIntroToken(null)
  }, [])

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
    if (activeTab !== "Workflow") {
      setWorkflowVariantEditSession(false)
    }
  }, [activeTab, workflowVariantEditSession])

  const clearPendingOpenRunId = React.useCallback(() => {
    setPendingOpenRunId(null)
  }, [])

  const clearPendingEvaluateRunId = React.useCallback(() => {
    setPendingEvaluateRunId(null)
  }, [])

  const openEvaluateRunFromWorkflow = React.useCallback((runId: string) => {
    setPendingEvaluateRunId(runId)
    setActiveTab("Analytics")
  }, [setActiveTab])

  const clearPendingForkFromRun = React.useCallback(() => {
    setPendingForkFromRun(null)
  }, [])

  const mainSection = (
    <>
      {/* Top Bar */}
      <div className="grid h-14 shrink-0 grid-cols-[1fr_auto_1fr] items-center border-b border-border bg-background px-4">
        {/* Left: Logo and Project Name */}
        <div className="flex min-w-0 w-full items-center justify-start gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-muted text-foreground font-bold text-sm border border-border">
            A
          </div>
          <span className="text-sm font-normal text-foreground">Antlio Testing / Sidebar</span>
        </div>

        {/* Center: Navigation Tabs — grid keeps this centered regardless of right-slot width */}
        <div className="flex items-center gap-0.5 rounded-lg bg-muted p-1">
          {["Workflow", "Export", "Analytics", "Evaluator"].map((tab) => (
            <button
              key={tab}
              onClick={() => {
                if (tab === "Analytics") {
                  setResetAnalyticsKey((k) => k + 1)
                }
                setActiveTab(tab)
              }}
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

        {/* Right: Run/Publish or Ask AI */}
        <div className="flex min-w-0 w-full items-center justify-end gap-2">
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
                      <GitBranch className="size-4 shrink-0 opacity-70" strokeWidth={1.75} />
                      Review changes
                    </button>
                    <div className="flex items-center gap-2.5 px-2.5 py-2.5">
                      <Checkbox
                        id="publish-run-evaluator"
                        checked={runEvaluatorOnPublish}
                        onCheckedChange={(v) => setRunEvaluatorOnPublish(v === true)}
                      />
                      <Label
                        htmlFor="publish-run-evaluator"
                        className="cursor-pointer text-sm font-normal text-muted-foreground hover:text-foreground"
                      >
                        Run evaluator before publishing
                      </Label>
                    </div>
                    <div className="border-t border-border p-2">
                      <Button
                        type="button"
                        className="h-10 w-full rounded-md bg-foreground text-sm font-semibold text-background hover:bg-foreground/90"
                        onClick={() => {
                          setPublishMenuOpen(false)
                          if (runEvaluatorOnPublish) {
                            setActiveTab("Evaluator")
                          }
                        }}
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

      {/* Main Content Area */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Left app rail (matches narrow icon navbar reference) */}
        <TooltipProvider delayDuration={100}>
          <nav
            className="flex h-full min-h-0 w-10 shrink-0 flex-col justify-between border-r border-neutral-200 bg-white py-2"
            aria-label="Main"
          >
            <div className="flex flex-col items-center gap-px px-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className={sidebarIconBtn} aria-label="Search">
                    <Search className="size-4 stroke-[1.5]" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8} hideArrow>
                  <span>Search</span>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className={sidebarIconBtn} aria-label="Projects">
                    <Home className="size-4 stroke-[1.5]" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8} hideArrow>
                  <span>Projects</span>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className={sidebarIconBtn} aria-label="Data">
                    <Database className="size-4 stroke-[1.5]" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8} hideArrow>
                  <span>Data</span>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className={sidebarIconBtn} aria-label="Integrations">
                    <Plug className="size-4 stroke-[1.5]" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8} hideArrow>
                  <span>Integrations</span>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className={sidebarIconBtn} aria-label="Editor">
                    <SquarePen className="size-4 stroke-[1.5]" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8} hideArrow>
                  <span>Editor</span>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className={sidebarIconBtn} aria-label="Web">
                    <Globe className="size-4 stroke-[1.5]" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8} hideArrow>
                  <span>Web</span>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className={sidebarIconBtn}
                    aria-label="Analytics"
                    onClick={() => router.push("/analytics")}
                  >
                    <BarChart3 className="size-4 stroke-[1.5]" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8} hideArrow>
                  <span>Analytics</span>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className={sidebarIconBtn} aria-label="AI">
                    <Bot className="size-4 stroke-[1.5]" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8} hideArrow>
                  <span>AI</span>
                </TooltipContent>
              </Tooltip>
            </div>

            <div className="flex flex-col items-center gap-px px-0 pb-0.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className={cn(sidebarIconBtn, "relative")} aria-label="Notifications">
                    <Bell className="size-4 stroke-[1.5]" />
                    <span className="absolute right-0.5 top-0.5 h-[5px] w-[5px] rounded-full bg-blue-500 ring-1 ring-white" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8} hideArrow>
                  <span>Notifications</span>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className={sidebarIconBtn} aria-label="Help">
                    <HelpCircle className="size-4 stroke-[1.5]" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8} hideArrow>
                  <span>Help</span>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className={cn(sidebarIconBtn, "relative")} aria-label="System status">
                    <Activity className="size-4 stroke-[1.5]" />
                    <span className="absolute right-0.5 top-0.5 h-[5px] w-[5px] rounded-full bg-emerald-500 ring-1 ring-white" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8} hideArrow>
                  <span>Status</span>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-neutral-100 text-xs font-semibold text-neutral-800 transition-colors hover:bg-neutral-200/90"
                    aria-label="Profile"
                  >
                    D
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8} hideArrow>
                  <span>Profile</span>
                </TooltipContent>
              </Tooltip>
            </div>
          </nav>
        </TooltipProvider>

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

