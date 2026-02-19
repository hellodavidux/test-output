"use client"

import React, { useState, useEffect, useRef } from "react"
import { Clock, X, ChevronUp, Maximize2 } from "lucide-react"
import type { Node } from "@xyflow/react"
import { getNodeIconBg, AppIcon } from "./workflow-node"
import { NodeDetailModal } from "./node-detail-modal"
import { WorkflowGantt, type GanttNode } from "./workflow-gantt"
import { TabContext } from "./dashboard-layout"

interface RunProgressProps {
  nodes: Node[]
  isRunning?: boolean
  runStatus?: "success" | "error" | "running"
  shouldExpand?: boolean
  onExpandChange?: (expanded: boolean) => void
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

export function RunProgress({ nodes, isRunning = false, runStatus = "success", shouldExpand = false, onExpandChange }: RunProgressProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [selectedGanttNodeId, setSelectedGanttNodeId] = useState<string | null>(null)
  const [runStartTime, setRunStartTime] = useState<number | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const tabContext = React.useContext(TabContext)

  React.useEffect(() => {
    if (isRunning) setRunStartTime((t) => t ?? Date.now())
    else setRunStartTime(null)
  }, [isRunning])

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

  // Find the full node object by id
  const findNodeById = (nodeId: string): Node | undefined => {
    return nodes.find(n => n.id === nodeId)
  }

  // Handle node click to open modal (from list)
  const handleNodeClick = (nodeProgressItem: NodeProgress) => {
    const node = findNodeById(nodeProgressItem.id)
    if (node) {
      const nodeWithIdentifier = {
        ...node,
        data: {
          ...node.data,
          _identifier: nodeProgressItem.identifier,
          _duration: nodeProgressItem.duration,
        }
      }
      setSelectedNode(nodeWithIdentifier)
    }
  }

  // Handle Gantt node click (compact panel) – open modal for that node
  const handleGanttNodeSelect = (ganttNode: GanttNode | null) => {
    if (!ganttNode) {
      setSelectedNode(null)
      setSelectedGanttNodeId(null)
      return
    }
    setSelectedGanttNodeId(ganttNode.id)
    const duration = ganttNode.endSec - ganttNode.startSec
    const isError = ganttNode.status === "error"
    const errorOutput = isError
      ? `Error: ${ganttNode.label} failed to complete.\n\nThis node did not run successfully. Check configuration, credentials, or inputs and try again.`
      : undefined
    const match = nodes.find(
      (n) =>
        (n.data as any)?.actionName === ganttNode.label ||
        (n.data as any)?.appName === ganttNode.label
    )
    if (match) {
      setSelectedNode({
        ...match,
        data: {
          ...match.data,
          _duration: duration,
          ...(errorOutput != null && { output: errorOutput }),
        },
      } as Node)
    } else {
      const syntheticNode: Node = {
        id: ganttNode.id,
        position: { x: 0, y: 0 },
        data: {
          appName: ganttNode.label,
          actionName: ganttNode.label,
          type: "action",
          _duration: duration,
          ...(errorOutput != null && { output: errorOutput }),
        },
      } as Node
      setSelectedNode(syntheticNode)
    }
  }

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
    } else if ((appName === "AI Agent" && actionName === "LLM") || appName.toLowerCase().includes("openai") || appName.toLowerCase().includes("anthropic")) {
      // Count LLM nodes separately
      const llmIndex = nodes.slice(0, index + 1).filter(n => {
        const d = n.data as any
        return (d?.appName === "AI Agent" && d?.actionName === "LLM") || d?.appName?.toLowerCase().includes("openai") || d?.appName?.toLowerCase().includes("anthropic")
      }).length - 1
      identifier = `llm-${llmIndex}`
    } else if (actionName.toLowerCase().includes("if") || actionName.toLowerCase().includes("else")) {
      identifier = `ifelse-${index}`
    } else if (actionName.toLowerCase().includes("loop")) {
      identifier = `loop_subflow-${index}`
    } else if (actionName.toLowerCase().includes("delay")) {
      identifier = `delay-${index}`
    } else {
      // Fallback: use node id
      identifier = node.id.includes("-") 
        ? node.id.split("-").slice(-2).join("-")
        : node.id
    }

    // Determine status based on node type and run state
    let status: "pending" | "running" | "success" | "error" = "success"
    if (isRunning) {
      // When workflow is running, show nodes as running
      status = "running"
    }

    // Generate duration for certain node types
    let duration: number | undefined
    if ((appName === "AI Agent" && actionName === "LLM") || appName.toLowerCase().includes("openai")) {
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
      if (target.closest('[data-node-detail-modal]')) {
        return
      }
      
      // Don't close if clicking inside the run progress panel
      if (target.closest('[data-run-progress-panel]')) {
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
  const renderRunProgressPanel = (isInModal: boolean = false, onModalClose?: () => void, onStandaloneClose?: () => void) => (
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
        <div className={`flex items-center justify-between px-6 py-4 border-b flex-shrink-0 ${isInModal ? 'rounded-t-lg' : ''}`}>
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold">Run Progress</h2>
            <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${
              runStatus === "success" 
                ? "bg-green-100 text-green-700" 
                : runStatus === "error"
                ? "bg-red-100 text-red-700"
                : "bg-purple-100 text-purple-700"
            }`}>
              {runStatus === "success" ? "Success" : runStatus === "error" ? "Error" : "Running"}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {!isInModal && tabContext && (
              <button
                onClick={() => {
                  tabContext.setOpenAnalyticsRunDetail(true)
                  tabContext.setActiveTab("Analytics")
                  tabContext.setResetAnalyticsKey?.((k) => k + 1)
                  handleExpandChange(false)
                }}
                className="rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden p-1"
                aria-label="Expand to Analytics"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            )}
            {isInModal && onModalClose ? (
              <button
                onClick={() => {
                  onModalClose()
                  onStandaloneClose?.()
                }}
                className="rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden p-1"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            ) : !selectedNode ? (
              <button
                onClick={() => handleExpandChange(false)}
                className="rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden p-1"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            ) : null}
          </div>
        </div>

        {/* Content - Compact Gantt (scrollable sideways) */}
        <div className={`${isInModal ? "rounded-b-lg" : "flex-1 min-h-0 flex flex-col"} overflow-hidden px-3 py-3 bg-muted/30`}>
          <WorkflowGantt compact onNodeSelect={handleGanttNodeSelect} selectedNodeId={selectedGanttNodeId} isRunning={isRunning} runStartTime={runStartTime} />
        </div>
      </div>
    </div>
  )

  // Expanded state - modal/panel
  return (
    <>
      <div 
        ref={containerRef}
        data-run-progress-panel="standalone"
        className="fixed bottom-6 right-6 z-50 w-[400px] max-h-[80vh] bg-white rounded-lg shadow-xl flex flex-col"
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
            setSelectedGanttNodeId(null)
            // Also close the RunProgress panel when modal closes
            handleExpandChange(false)
          }}
          showRunProgress={true}
          runProgressComponent={renderRunProgressPanel(true, () => {
            setSelectedNode(null)
            setSelectedGanttNodeId(null)
            handleExpandChange(false)
          }, () => handleExpandChange(false))}
        />
      )}
    </>
  )
}
