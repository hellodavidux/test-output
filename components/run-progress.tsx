"use client"

import React, { useState, useEffect, useRef } from "react"
import { Clock, X, ChevronUp, CheckCircle2, Loader2 } from "lucide-react"
import type { Node } from "@xyflow/react"
import { getNodeIconBg, AppIcon } from "./workflow-node"
import { NodeDetailModal } from "./node-detail-modal"

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
  const panelRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

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

  // Handle node click to open modal
  const handleNodeClick = (nodeProgressItem: NodeProgress) => {
    const node = findNodeById(nodeProgressItem.id)
    if (node) {
      // Store the identifier in the node data temporarily for the modal
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
      identifier = `out-${index}`
    } else if (appName.toLowerCase().includes("openai") || appName.toLowerCase().includes("anthropic")) {
      identifier = `llm-${index}`
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
    if (type === "action" && appName.toLowerCase().includes("openai")) {
      duration = 6.2
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
            <h2 className="text-lg font-semibold">Run Progress</h2>
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

        {/* Content - Scrollable list */}
        <div className={`${isInModal ? 'rounded-b-lg' : 'flex-1'} overflow-y-auto px-4 py-4`}>
          <div className="space-y-1">
            {nodeProgress.map((nodeProgressItem) => (
              <div
                key={nodeProgressItem.id}
                onClick={() => handleNodeClick(nodeProgressItem)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer border ${
                  selectedNode?.id === nodeProgressItem.id 
                    ? "bg-gray-100 border-gray-300" 
                    : "bg-white border-gray-100"
                }`}
              >
                {/* Icon */}
                <div className="flex-shrink-0">
                  {nodeProgressItem.nodeData.appName === "AI Agent" && nodeProgressItem.nodeData.actionName === "LLM" ? (
                    // Special case for AI Agent/LLM - use the same SVG icon as in the node
                    <div className="w-8 h-8 flex items-center justify-center flex-shrink-0 border border-border rounded">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-foreground">
                        <path d="M12 2L2 7l10 5 10-5-10-5z" />
                        <path d="M2 17l10 5 10-5" />
                        <path d="M2 12l10 5 10-5" />
                      </svg>
                    </div>
                  ) : (
                    <div className={`w-8 h-8 rounded-lg border border-border flex items-center justify-center ${
                      nodeProgressItem.type === "input" ? "bg-white" : "bg-muted"
                    }`}>
                      <AppIcon appName={nodeProgressItem.nodeData.appName} className="w-4 h-4" />
                    </div>
                  )}
                </div>

                {/* Node name with identifier */}
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  <div className="text-sm font-medium text-foreground truncate">{nodeProgressItem.name}</div>
                  <span className="px-2 py-0.5 text-xs font-normal text-gray-400 bg-white border border-gray-200 rounded-md">
                    {nodeProgressItem.identifier}
                  </span>
                </div>

                {/* Duration */}
                {nodeProgressItem.duration && (
                  <div className="flex-shrink-0 text-xs text-gray-500">
                    {nodeProgressItem.duration}s
                  </div>
                )}

                {/* Checkmark/Status Icon */}
                <div className="flex-shrink-0">
                  {nodeProgressItem.status === "running" ? (
                    <Loader2 className="w-5 h-5 text-purple-600 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  )}
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
            // Also close the RunProgress panel when modal closes
            handleExpandChange(false)
          }}
          showRunProgress={true}
          runProgressComponent={renderRunProgressPanel(true, () => {
            setSelectedNode(null)
            handleExpandChange(false)
          }, () => handleExpandChange(false))}
        />
      )}
    </>
  )
}
