"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import {
  Clock,
  ChevronUp,
  ChevronDown,
  Loader2,
  CheckCircle2,
  Database,
  BarChart3,
  MoreVertical,
  GitCompare,
  ListChecks,
} from "lucide-react"
import type { Node, Edge } from "@xyflow/react"
import { getNodeIconBg, AppIcon } from "./workflow-node"
import { NodeDetailModal } from "./node-detail-modal"
import { TabContext } from "./dashboard-layout"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { SaveRunToDatabaseModal } from "./save-run-to-database-modal"
import type { WorkflowNodeData } from "@/lib/types"
import { cn } from "@/lib/utils"
import { EVAL_RUN_PRESET_LIST } from "@/lib/evaluate-run-presets"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const DEFAULT_WORKFLOW_INPUT_FALLBACK =
  "I was charged twice for my Pro subscription this month. This is the third time I've reached out with no response."

/** Pull trigger/input message from workflow node data after a run (matches page.tsx mock email payload). */
function getWorkflowCaseInput(nodes: Node[]): string {
  for (const n of nodes) {
    const d = n.data as WorkflowNodeData
    const inp = d?.input
    if (inp && typeof inp === "object" && "message" in inp) {
      const msg = (inp as { message?: unknown }).message
      if (typeof msg === "string" && msg.trim()) return msg.trim()
    }
  }
  return DEFAULT_WORKFLOW_INPUT_FALLBACK
}

interface RunProgressProps {
  nodes: Node[]
  edges?: Edge[]
  isRunning?: boolean
  runStatus?: "success" | "error" | "running"
  shouldExpand?: boolean
  onExpandChange?: (expanded: boolean) => void
  /** Current workflow run id (used when forking from Run progress). */
  runId?: string
}

interface NodeProgress {
  id: string
  name: string
  type: string
  status: "pending" | "running" | "success" | "error"
  duration?: number
  identifier: string
  appName: string
  nodeData: { appName: string; actionName: string; type: string }
}

export function RunProgress({
  nodes,
  edges = [],
  isRunning = false,
  runStatus = "success",
  shouldExpand = false,
  onExpandChange,
  runId,
}: RunProgressProps) {
  const [stableFallbackRunId] = useState(
    () =>
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `run-${Date.now()}`,
  )
  const effectiveRunId = runId ?? stableFallbackRunId

  const [isExpanded, setIsExpanded] = useState(true)
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [saveToDatabaseOpen, setSaveToDatabaseOpen] = useState(false)
  const [workflowEvaluateOpen, setWorkflowEvaluateOpen] = useState(false)
  const [workflowEvaluatePresetId, setWorkflowEvaluatePresetId] = useState(EVAL_RUN_PRESET_LIST[0]!.id)
  const [workflowEvaluateBusy, setWorkflowEvaluateBusy] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const tabContext = React.useContext(TabContext)

  // Sync with external shouldExpand prop
  useEffect(() => {
    if (shouldExpand && !isExpanded) {
      setIsExpanded(true)
      onExpandChange?.(true)
    }
  }, [shouldExpand, isExpanded, onExpandChange])

  // Update parent when expansion changes
  const handleExpandChange = (expanded: boolean) => {
    setIsExpanded(expanded)
    onExpandChange?.(expanded)
  }

  const confirmWorkflowEvaluate = useCallback(() => {
    if (!tabContext?.applyRunEvaluationOverride || workflowEvaluateBusy) return
    const ctx = tabContext
    const preset = EVAL_RUN_PRESET_LIST.find((p) => p.id === workflowEvaluatePresetId)
    if (!preset) return
    setWorkflowEvaluateBusy(true)
    const targetRunId = effectiveRunId
    window.setTimeout(() => {
      ctx.applyRunEvaluationOverride(targetRunId, {
        evaluatorName: preset.evaluatorName,
        score: preset.score,
        summary: preset.summary,
      })
      toast.success("Evaluation complete", {
        description: `${preset.evaluatorName}: ${(preset.score / 10).toFixed(1)}/10 — results are in the Evaluation section of the run panel.`,
      })
      ctx.setResetAnalyticsKey?.((k) => k + 1)
      ctx.openAnalyticsRunDetailForRun(targetRunId)
      handleExpandChange(false)
      setWorkflowEvaluateBusy(false)
      setWorkflowEvaluateOpen(false)
    }, 950)
  }, [tabContext, workflowEvaluateBusy, workflowEvaluatePresetId, effectiveRunId, handleExpandChange])

  const selectedWorkflowEvaluatePreset =
    EVAL_RUN_PRESET_LIST.find((p) => p.id === workflowEvaluatePresetId) ?? EVAL_RUN_PRESET_LIST[0]!

  // Generate node progress data from nodes
  const nodeProgress: NodeProgress[] = nodes.map((node, index) => {
    const data = node.data as any
    const appName = data?.appName || "Unknown"
    const actionName = data?.actionName || "Node"
    const type = data?.type || "action"
    
    // Store the full node data for icon rendering
    const nodeData = { appName, actionName, type }
    
    // Generate identifier based on type and index (matching the pattern in the image)
    let identifier = ""
    if (type === "input") {
      identifier = `in-${index}`
    } else if (type === "output") {
      // Count output nodes separately
      const outputIndex = nodes.slice(0, index + 1).filter(n => (n.data as any)?.type === "output").length - 1
      identifier = `out-${outputIndex}`
    } else if (
      (appName === "AI Agent" && actionName === "LLM") ||
      actionName === "Draft Response" ||
      actionName === "Intent Classifier" ||
      appName.toLowerCase().includes("openai") ||
      appName.toLowerCase().includes("anthropic")
    ) {
      // Count LLM nodes separately
      const llmIndex =
        nodes.slice(0, index + 1).filter((n) => {
          const d = n.data as any
          const a = d?.actionName
          return (
            (d?.appName === "AI Agent" && a === "LLM") ||
            a === "Draft Response" ||
            a === "Intent Classifier" ||
            d?.appName?.toLowerCase().includes("openai") ||
            d?.appName?.toLowerCase().includes("anthropic")
          )
        }).length - 1
      identifier = `llm-${llmIndex}`
    } else if (actionName.toLowerCase().includes("if") || actionName.toLowerCase().includes("else")) {
      identifier = `ifelse-${index}`
    } else if (actionName.toLowerCase().includes("loop")) {
      identifier = `loop_subflow-${index}`
    } else if (actionName.toLowerCase().includes("delay")) {
      identifier = `delay-${index}`
    } else {
      // Fallback: action-N
      const actionIndex = nodes.slice(0, index + 1).filter(n => {
        const d = n.data as any
        const t = d?.type || "action"
        return t !== "input" && t !== "output"
      }).length - 1
      identifier = `action-${actionIndex}`
    }

    // Determine status based on node type and run state
    let status: "pending" | "running" | "success" | "error" = "success"
    if (isRunning) {
      // When workflow is running, show nodes as running
      status = "running"
    }

    // Generate duration for certain node types
    let duration: number | undefined
    if (
      (appName === "AI Agent" && actionName === "LLM") ||
      actionName === "Draft Response" ||
      actionName === "Intent Classifier" ||
      appName.toLowerCase().includes("openai")
    ) {
      duration = 11.3 // Match the image example
    } else if (actionName.toLowerCase().includes("delay")) {
      duration = 5.0
    }

    return {
      id: node.id,
      name: actionName,
      type: type,
      status,
      duration,
      identifier,
      appName,
      nodeData,
    }
  })


  // Handle click outside to close
  useEffect(() => {
    if (!isExpanded) return

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement

      // Don't close if clicking on the modal (which is rendered via portal)
      if (target.closest("[data-node-detail-modal]")) {
        return
      }

      if (
        target.closest("[data-slot=\"dialog-content\"]") ||
        target.closest("[data-slot=\"dialog-overlay\"]")
      ) {
        return
      }

      // Radix menus/portals render outside the panel — clicks must not collapse the panel before onSelect runs
      if (
        target.closest('[data-slot="dropdown-menu-content"]') ||
        target.closest('[data-slot="dropdown-menu-sub-content"]')
      ) {
        return
      }

      // Don't close if clicking inside the run progress panel
      if (target.closest("[data-run-progress-panel]")) {
        return
      }

      // Close if clicking outside the container (the outer fixed div)
      if (containerRef.current && !containerRef.current.contains(target)) {
        handleExpandChange(false)
      }
    }

    // Add listener with a small delay to avoid immediate closing when expanding
    const timeoutId = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside, true)
    }, 10)

    return () => {
      clearTimeout(timeoutId)
      document.removeEventListener("mousedown", handleClickOutside, true)
    }
  }, [isExpanded])

  if (!isExpanded) {
    // Collapsed state - bottom right
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => handleExpandChange(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow"
        >
          <Clock className="w-4 h-4 text-foreground" />
          <span className="text-sm font-medium text-foreground">Run progress</span>
          <ChevronUp className="w-4 h-4 text-foreground" />
        </button>
      </div>
    )
  }

  // Render run progress panel content (to be used in modal or standalone)
  const renderRunProgressPanel = (isInModal: boolean = false) => (
    <div 
      data-run-progress-panel={isInModal ? "in-modal" : "standalone-content"}
      className={`w-[400px] ${isInModal ? 'h-fit' : 'max-h-full'} flex flex-col ${isInModal ? 'rounded-lg' : ''}`}
      onClick={(e) => {
        // Stop propagation to prevent modal from closing when clicking inside
        e.stopPropagation()
      }}
      onMouseDown={(e) => {
        // Stop propagation on mousedown as well
        e.stopPropagation()
      }}
    >
      <div ref={panelRef} className={`flex flex-col ${isInModal ? 'h-fit' : 'h-full'}`}>
        {/* Header */}
        <div className={`flex items-center justify-between pl-6 pr-3 py-4 border-b flex-shrink-0 ${isInModal ? 'rounded-t-lg' : ''}`}>
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold">Run progress</h2>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-medium rounded-md border ${
              runStatus === "success"
                ? "bg-green-50 text-green-700 border-green-200"
                : runStatus === "error"
                ? "bg-red-50 text-red-700 border-red-200"
                : "bg-white text-purple-600 border-purple-300"
            }`}>
              {runStatus === "running" && <Loader2 className="w-3 h-3 animate-spin" />}
              {runStatus === "success" ? "Success" : runStatus === "error" ? "Error" : "Running"}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {!isInModal && tabContext && (
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className={cn(
                        "h-7 rounded-md px-3 text-xs font-medium text-foreground shadow-none bg-white hover:bg-gray-50",
                        runStatus === "running" && "opacity-50",
                      )}
                      aria-disabled={runStatus === "running"}
                      onClick={() => {
                        if (runStatus === "running") return
                        setWorkflowEvaluatePresetId(EVAL_RUN_PRESET_LIST[0]!.id)
                        setWorkflowEvaluateOpen(true)
                      }}
                    >
                      Evaluate Run
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    {runStatus === "running"
                      ? "Wait until this run finishes before running an evaluation."
                      : "Choose an evaluator, run it on this run, then open Run details with the new score in the Evaluation section."}
                  </TooltipContent>
                </Tooltip>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-7 w-7 rounded-md text-foreground shadow-none bg-white hover:bg-gray-50"
                      aria-label="More options"
                    >
                      <MoreVertical className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <DropdownMenuItem
                          className="cursor-pointer"
                          onSelect={() => setSaveToDatabaseOpen(true)}
                        >
                          <Database className="h-4 w-4" />
                          Save Run to dataset
                        </DropdownMenuItem>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="max-w-xs">
                        Store this run’s inputs and outputs in a dataset for training, review, or audits later.
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <DropdownMenuItem
                          className="cursor-pointer"
                          onSelect={() => {
                            tabContext.openExperimentVariantBuilderIntro?.({
                              seedFromRun: {
                                runId: effectiveRunId,
                                caseInput: getWorkflowCaseInput(nodes),
                              },
                            })
                            handleExpandChange(false)
                          }}
                        >
                          <GitCompare className="h-4 w-4" />
                          Compare to variation
                        </DropdownMenuItem>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="max-w-xs">
                        Open the Experiment tab with this run in the matrix, then the same variant-builder intro as Add
                        variant column (Workflow → Create variant).
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <DropdownMenuItem
                          className="cursor-pointer"
                          onSelect={() => {
                            tabContext.setResetAnalyticsKey?.((k) => k + 1)
                            tabContext.openAnalyticsRunDetailForRun(effectiveRunId)
                            handleExpandChange(false)
                          }}
                        >
                          <BarChart3 className="h-4 w-4" />
                          Inspect Run
                        </DropdownMenuItem>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="max-w-xs">
                        Open the Analytics tab with run detail focused for a deeper breakdown of this run.
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <DropdownMenuItem
                          className={cn("cursor-pointer gap-2", runStatus === "running" && "opacity-50")}
                          aria-disabled={runStatus === "running"}
                          onSelect={(e) => {
                            e.preventDefault()
                            if (runStatus === "running") return
                            tabContext.openEvaluateRunFromWorkflow(effectiveRunId)
                            handleExpandChange(false)
                          }}
                        >
                          <ListChecks className="h-4 w-4" />
                          Evaluate Run
                        </DropdownMenuItem>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="max-w-xs">
                        {runStatus === "running"
                          ? "Wait until this run finishes before running an evaluation."
                          : "Pick an evaluator and score this run in Analytics (same as Run Details ⋯ menu)."}
                      </TooltipContent>
                    </Tooltip>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TooltipProvider>
            )}
          </div>
        </div>

        {/* Content - Node list */}
        <div className={`${isInModal ? "rounded-b-lg" : "flex-1 min-h-0 rounded-b-lg"} overflow-y-auto px-5 py-3 bg-[#f7f7f8]`}>
          <div className="flex flex-col">
            {nodeProgress.map((item, index) => (
              <div key={item.id} className="flex gap-2.5 items-start">
                {/* Left icon + connector line — height matches card row */}
                <div className="flex flex-col items-center shrink-0 w-7">
                  <div className="h-11 flex items-center justify-center">
                    <div className="w-7 h-7 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center shrink-0">
                      <AppIcon appName={item.nodeData.appName} className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  {index < nodeProgress.length - 1 && (
                    <div className="w-px bg-gray-200 my-0.5" style={{ flex: 1, minHeight: 8 }} />
                  )}
                </div>

                {/* Node card */}
                <div className={`min-w-0 flex-1 flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 h-11 ${index < nodeProgress.length - 1 ? "mb-0.5" : ""}`}>
                  <div className="flex items-center gap-2 min-w-0">
                    {item.status === "running" ? (
                      <Loader2 className="w-4 h-4 text-purple-500 animate-spin flex-shrink-0" />
                    ) : item.status === "success" ? (
                      <CheckCircle2 className="w-[18px] h-[18px] text-green-500 flex-shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-gray-300 flex-shrink-0" />
                    )}
                    <span className="font-semibold text-[13px] text-gray-900 truncate">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                    {item.duration != null && (
                      <span className="text-xs text-gray-400">{item.duration}s</span>
                    )}
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )

  // Expanded state - modal/panel
  return (
    <>
      <SaveRunToDatabaseModal
        open={saveToDatabaseOpen}
        onOpenChange={setSaveToDatabaseOpen}
        runId={effectiveRunId}
      />
      <Dialog
        open={workflowEvaluateOpen}
        onOpenChange={(open) => {
          if (!open && workflowEvaluateBusy) return
          setWorkflowEvaluateOpen(open)
        }}
      >
        <DialogContent className="h-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Evaluate run</DialogTitle>
            <DialogDescription>
              Pick an evaluator, run it against this run, and see the score in the run sidebar under Evaluation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-1">
            <Label htmlFor="evaluate-preset-workflow-run-progress" className="text-sm text-muted-foreground">
              Evaluator
            </Label>
            <Select
              value={workflowEvaluatePresetId}
              onValueChange={setWorkflowEvaluatePresetId}
              disabled={workflowEvaluateBusy}
            >
              <SelectTrigger
                id="evaluate-preset-workflow-run-progress"
                className="h-auto min-h-10 w-full items-start gap-3 whitespace-normal py-3 data-[size=default]:h-auto [&>svg]:mt-0.5 [&>svg]:shrink-0 [&_[data-slot=select-value]]:line-clamp-none [&_[data-slot=select-value]]:min-h-0 [&_[data-slot=select-value]]:w-full [&_[data-slot=select-value]]:flex-1 [&_[data-slot=select-value]]:items-start [&_[data-slot=select-value]]:self-stretch"
              >
                <SelectValue placeholder="Select evaluator">
                  <span className="flex min-w-0 flex-col items-start gap-0.5 text-left">
                    <span className="text-sm font-medium leading-snug text-foreground">
                      {selectedWorkflowEvaluatePreset.evaluatorName}
                    </span>
                    <span className="text-xs font-normal leading-tight text-muted-foreground">
                      Node · {selectedWorkflowEvaluatePreset.evaluatedNodeLabel}
                    </span>
                  </span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="max-w-[min(100vw-2rem,26rem)]">
                {EVAL_RUN_PRESET_LIST.map((p) => (
                  <SelectItem key={p.id} value={p.id} className="items-start py-2.5">
                    <span className="flex min-w-0 flex-col gap-0.5 pr-6 text-left">
                      <span className="text-sm font-medium leading-snug">{p.evaluatorName}</span>
                      <span className="text-xs font-normal leading-tight text-muted-foreground">{p.subtitle}</span>
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
              onClick={() => setWorkflowEvaluateOpen(false)}
              disabled={workflowEvaluateBusy}
            >
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={confirmWorkflowEvaluate} disabled={workflowEvaluateBusy}>
              {workflowEvaluateBusy ? (
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
      <div 
        ref={containerRef}
        data-run-progress-panel="standalone"
        className="fixed bottom-6 right-6 z-50 w-[400px] max-h-[80vh] bg-white rounded-lg shadow-xl flex flex-col overflow-hidden"
        onClick={(e) => {
          // Stop propagation to prevent modal from closing when clicking inside
          e.stopPropagation()
        }}
        onMouseDown={(e) => {
          // Stop propagation on mousedown as well
          e.stopPropagation()
        }}
      >
        {renderRunProgressPanel()}
      </div>
      
      {/* Node Detail Modal - with run progress included */}
      {selectedNode && (
        <NodeDetailModal
          node={selectedNode}
          onClose={() => {
            setSelectedNode(null)
            // Also close the RunProgress panel when modal closes
            handleExpandChange(false)
          }}
          showRunProgress={true}
          runProgressComponent={renderRunProgressPanel(true)}
          nodes={nodes}
          edges={edges}
        />
      )}
    </>
  )
}
