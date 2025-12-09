"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import { ReactFlow, Background, ReactFlowProvider, useNodesState, useEdgesState, useReactFlow } from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { DashboardLayout } from "@/components/dashboard-layout"
import WorkflowNode from "@/components/workflow-node"
import { NodeSettingsSidebar } from "@/components/node-settings-sidebar"
import { RunProgress } from "@/components/run-progress"
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuShortcut, ContextMenuTrigger } from "@/components/ui/context-menu"
import { Play, StickyNote, Clipboard, ClipboardX } from "lucide-react"
import type { Node, Edge } from "@xyflow/react"
import type { WorkflowNodeData, SelectedAction } from "@/lib/types"

const nodeTypes = {
  workflowNode: WorkflowNode,
}

function FlowCanvas({
  onActionSelectRef,
  onRunRef,
}: {
  onActionSelectRef: React.MutableRefObject<((action: SelectedAction) => void) | null>
  onRunRef: React.MutableRefObject<(() => void) | null>
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [isInitialized, setIsInitialized] = useState(false)
  const [isRunMode, setIsRunMode] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [openIOPanels, setOpenIOPanels] = useState<Set<string>>(new Set())
  const [activeIOTabs, setActiveIOTabs] = useState<Map<string, "output" | "completion">>(new Map())
  const [dismissedIOPanels, setDismissedIOPanels] = useState<Map<string, Set<"output" | "completion">>>(new Map())
  const [clearedOutputs, setClearedOutputs] = useState<Set<string>>(new Set())
  const [pinnedIOPanels, setPinnedIOPanels] = useState<Set<string>>(new Set())
  const [selectedNodeData, setSelectedNodeData] = useState<{
    id: string
    appName: string
    actionName: string
    description: string
    type?: "trigger" | "action" | "input" | "output"
  } | null>(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number; y: number } | null>(null)
  const [shouldExpandRunProgress, setShouldExpandRunProgress] = useState(false)
  const { screenToFlowPosition } = useReactFlow()

  const handleActionSelect = (action: SelectedAction, sourceNodeId?: string, side?: "left" | "right") => {
    // Check if we're replacing a node
    const replaceNodeId = (window as any).__replaceNodeId
    if (replaceNodeId) {
      // Replace the existing node
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === replaceNodeId) {
            return {
              ...node,
              data: {
                ...node.data,
                appName: action.appName,
                actionName: action.actionName,
                description: action.description,
                type: action.type,
                version: "v1.0.0",
                onDeleteNode: handleDeleteNode,
              },
            }
          }
          return node
        })
      )
      delete (window as any).__replaceNodeId
      return
    }

    let newNodePosition = { x: 0, y: 0 }
    
    if (sourceNodeId && side) {
      // Position next to the source node
      const sourceNode = nodes.find((n) => n.id === sourceNodeId)
      if (sourceNode) {
        const offsetX = side === "right" ? 450 : -450 // Position to the right or left
        newNodePosition = {
          x: sourceNode.position.x + offsetX,
          y: sourceNode.position.y,
        }
      }
    } else {
      // Create a new node at the center of the viewport
      const viewportWidth = window.innerWidth - 48 // Subtract sidebar width
      const viewportHeight = window.innerHeight - 56 // Subtract top bar height
      newNodePosition = {
        x: viewportWidth / 2 - 190, // Approximate center accounting for node width (380px)
        y: viewportHeight / 2 - 100, // Approximate center accounting for node height
      }
    }

    const newNodeData: WorkflowNodeData = {
      appName: action.appName,
      actionName: action.actionName,
      description: action.description,
      type: action.type,
      version: "v1.0.0",
      onDeleteNode: handleDeleteNode,
    }

    const newNode: Node = {
      id: `node-${Date.now()}`,
      type: "workflowNode",
      position: newNodePosition,
      data: newNodeData,
    }

    setNodes((nds) => [...nds, newNode])
  }

  const handleDeleteNode = (nodeId: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId))
    setEdges((eds) => eds.filter((e: any) => e.source !== nodeId && e.target !== nodeId))
    if (selectedNodeData?.id === nodeId) {
      setIsSidebarOpen(false)
      setSelectedNodeData(null)
    }
  }

  const handleNodeClick = (event: React.MouseEvent, node: Node) => {
    // Check if the click originated from the footer (Output/Completion buttons)
    const target = event.target as HTMLElement
    if (target.closest('[data-node-footer]')) {
      return // Don't open the configuration panel if clicking on the footer
    }
    
    if (node.type === "workflowNode") {
      const data = node.data as WorkflowNodeData
      setSelectedNodeData({
        id: node.id,
        appName: data.appName,
        actionName: data.actionName,
        description: data.description,
        type: data.type,
      })
      setIsSidebarOpen(true)
    }
  }

  const handlePaneClick = useCallback(() => {
    setIsSidebarOpen(false)
    setSelectedNodeData(null)
    setContextMenuPosition(null)
    // Close all IO panels when clicking on the pane, except pinned ones
    setOpenIOPanels((prev) => {
      const newSet = new Set<string>()
      // Keep only pinned panels open
      pinnedIOPanels.forEach((nodeId) => {
        if (prev.has(nodeId)) {
          newSet.add(nodeId)
        }
      })
      return newSet
    })
  }, [pinnedIOPanels])

  // Store the last mouse position for context menu
  const lastMousePosition = useRef<{ x: number; y: number } | null>(null)
  
  const handleMouseMove = (event: React.MouseEvent) => {
    lastMousePosition.current = { x: event.clientX, y: event.clientY }
  }
  
  const handleContextMenuOpenChange = (open: boolean) => {
    if (open && lastMousePosition.current) {
      setContextMenuPosition(lastMousePosition.current)
    }
  }


  const handleAddNote = () => {
    // Create a note node at cursor position
    if (contextMenuPosition) {
      const position = screenToFlowPosition({
        x: contextMenuPosition.x,
        y: contextMenuPosition.y,
      })
      
      const newNodeData: WorkflowNodeData = {
        appName: "Note",
        actionName: "Note",
        description: "A note",
        type: "action",
        version: "v1.0.0",
        onDeleteNode: handleDeleteNode,
      }
      
      const newNode: Node = {
        id: `node-${Date.now()}`,
        type: "workflowNode",
        position,
        data: newNodeData,
      }
      
      setNodes((nds) => [...nds, newNode])
    }
    setContextMenuPosition(null)
  }

  const handlePaste = () => {
    // TODO: Implement paste functionality
    setContextMenuPosition(null)
  }

  const handleClearClipboard = () => {
    // TODO: Implement clear clipboard functionality
    setContextMenuPosition(null)
  }

  const handleRun = () => {
    setContextMenuPosition(null)
    
    // Close the configuration panel when running
    setIsSidebarOpen(false)
    setSelectedNodeData(null)
    
    // Expand run progress window
    setShouldExpandRunProgress(true)
    
    // Reset dismissed state for all nodes when starting a new run
    setDismissedIOPanels(new Map())
    
    // Start loading animation
    setIsLoading(true)
    
    // Show running state immediately
    setIsRunning(true)
    
    // After a short delay, stop loading
    setTimeout(() => {
      setIsLoading(false)
    }, 500) // Loading animation for 500ms
    
    // After running for a bit, show success
    setTimeout(() => {
      setIsRunning(false)
      setIsRunMode(true)
      // Show notification dot on output buttons
      const defaultTabs = new Map(nodes.map(n => [n.id, "output" as const]))
      setActiveIOTabs(defaultTabs)
    }, 2000) // Run for 2 seconds
  }

  const handleClearOutput = useCallback((nodeId: string) => {
    setClearedOutputs((prev) => new Set(prev).add(nodeId))
  }, [])

  const handleToggleIOPanel = useCallback((nodeId: string, tab?: "output" | "completion") => {
    setOpenIOPanels((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(nodeId) && !tab) {
        // Close panel if no tab specified (close button clicked)
        newSet.delete(nodeId)
        // Mark the current active tab as dismissed so notification dot doesn't reappear
        setDismissedIOPanels((prev) => {
          const newMap = new Map(prev)
          const activeTab = activeIOTabs.get(nodeId) || "output"
          const dismissedTabs = new Set(newMap.get(nodeId) || [])
          dismissedTabs.add(activeTab)
          newMap.set(nodeId, dismissedTabs)
          return newMap
        })
      } else {
        // Open/expand panel (always open if tab is specified)
        newSet.add(nodeId)
        if (tab) {
          // Set active tab
          setActiveIOTabs((prev) => {
            const newMap = new Map(prev)
            newMap.set(nodeId, tab)
            return newMap
          })
          // Mark this specific tab as dismissed when opened
          setDismissedIOPanels((prev) => {
            const newMap = new Map(prev)
            const dismissedTabs = new Set(newMap.get(nodeId) || [])
            dismissedTabs.add(tab)
            newMap.set(nodeId, dismissedTabs)
            return newMap
          })
        }
      }
      return newSet
    })
  }, [activeIOTabs])

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = "move"
  }

  const handleDrop = (event: React.DragEvent) => {
      event.preventDefault()

      const data = event.dataTransfer.getData("application/reactflow")
    
      if (!data) return

    try {
      const action: SelectedAction = JSON.parse(data)
      
      // Calculate position in flow coordinates
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })
      
      const nodeId = `node-${Date.now()}`
      const newNodeData: WorkflowNodeData = {
        appName: action.appName,
        actionName: "", // Leave empty so user must select an action
        description: "",
        type: action.type,
        version: "v1.0.0",
        onDeleteNode: handleDeleteNode,
      }
      
      const newNode: Node = {
        id: nodeId,
        type: "workflowNode",
        position,
        data: newNodeData,
      }
      
      setNodes((nds) => [...nds, newNode])
      
      // Open the configuration sidebar for the new node without a selected action
      setSelectedNodeData({
        id: nodeId,
        appName: action.appName,
        actionName: "", // Leave empty so user must select an action
        description: "",
        type: action.type,
      })
      setIsSidebarOpen(true)
    } catch (error) {
      console.error("Error parsing drag data:", error)
    }
  }

  const handleNodeUpdate = (
    nodeId: string,
    data: { appName: string; actionName: string; description: string; type: "trigger" | "action" | "input" | "output" }
  ) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id !== nodeId) return node
        return {
          ...node,
          data: {
            ...node.data,
            appName: data.appName,
            actionName: data.actionName,
            description: data.description,
            type: data.type,
            onDeleteNode: handleDeleteNode,
          },
        }
      })
    )
    // Update the sidebar data
    if (selectedNodeData?.id === nodeId) {
      setSelectedNodeData({
        id: nodeId,
        appName: data.appName,
        actionName: data.actionName,
        description: data.description,
        type: data.type,
      })
    }
  }

  useEffect(() => {
    onActionSelectRef.current = (action: SelectedAction) => {
      const sourceInfo = (window as any).__handleClickSourceNode
      if (sourceInfo) {
        handleActionSelect(action, sourceInfo.nodeId, sourceInfo.side)
        delete (window as any).__handleClickSourceNode
      } else {
        handleActionSelect(action)
      }
    }
  }, [onActionSelectRef, nodes])

  useEffect(() => {
    onRunRef.current = handleRun
  }, [onRunRef, isRunMode, nodes])

  // Update nodes with run mode and IO panel state
  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => {
        const nodeData = node.data as WorkflowNodeData
        // Only update if something actually changed to avoid unnecessary re-renders
        const isIOPanelOpen = openIOPanels.has(node.id)
        const activeIOTab = activeIOTabs.get(node.id) ?? ("output" as "output" | "completion")
        const dismissedTabs = dismissedIOPanels.get(node.id) || new Set<"output" | "completion">()
        const isOutputDismissed = dismissedTabs.has("output")
        const isCompletionDismissed = dismissedTabs.has("completion")
        const isCleared = clearedOutputs.has(node.id)
        if (
          nodeData.isRunMode === isRunMode &&
          nodeData.isRunning === isRunning &&
          nodeData.isIOPanelOpen === isIOPanelOpen &&
          nodeData.activeIOTab === activeIOTab &&
          nodeData.isOutputDismissed === isOutputDismissed &&
          nodeData.isCompletionDismissed === isCompletionDismissed &&
          nodeData.onToggleIOPanel === handleToggleIOPanel
        ) {
          return node
        }
        return {
          ...node,
          data: {
            ...nodeData,
            isRunMode,
            isRunning,
            isIOPanelOpen,
            activeIOTab,
            isOutputDismissed,
            isCompletionDismissed,
            onToggleIOPanel: handleToggleIOPanel,
            onClearOutput: () => handleClearOutput(node.id),
            onPinChange: (isPinned: boolean) => {
              setPinnedIOPanels((prev) => {
                const newSet = new Set(prev)
                if (isPinned) {
                  newSet.add(node.id)
                } else {
                  newSet.delete(node.id)
                }
                return newSet
              })
            },
            // Only provide output data when in run mode and not cleared
            input: isRunMode && !isCleared ? {
              message: "Hello, world!",
              channel: "#general",
              user: "john.doe",
              timestamp: new Date().toISOString(),
            } : null,
            output: isRunMode && !isCleared ? {
              status: "success",
              message: "Request completed successfully",
              timestamp: new Date().toISOString(),
              data: {
                id: `msg_${node.id}`,
                type: "workflow_execution",
                execution_time: Math.floor(Math.random() * 500) + 100,
                results: {
                  processed: true,
                  records: Math.floor(Math.random() * 100) + 10,
                  errors: 0,
                },
                metadata: {
                  version: "1.0.0",
                  environment: "production",
                  region: "us-east-1",
                },
                nested: {
                  level1: {
                    level2: {
                      value: "deeply nested data",
                      count: 42,
                    },
                  },
                },
              },
              tags: ["processed", "success", "workflow"],
            } : null,
            completion: isRunMode && !isCleared ? "The email address [jdoe@stack-ai.com](mailto:jdoe@stack-ai.com) appears to be associated with Jane Doe, who is listed as an AI Engineer at Stack AI according to public organizational charts and professional profiles[^55269.0.0][^55279.0.0]. This address is likely a professional or corporate email used for work-related communications within Stack AI. Web search results confirm Jane Doe's role and provide a detailed background, including her previous positions and academic credentials, which further supports the legitimacy of the email as belonging to a real individual at Stack AI[^55269.0.0].\n\nAdditionally, a search of email records reveals that [jdoe@stack-ai.com](mailto:jdoe@stack-ai.com) has been involved in recent email activity, including receiving onboarding information for a Slack workspace and sending or receiving other messages. The content of these emails is consistent with typical business communications, such as workspace setup instructions and notifications[^55279.0.0]. This further corroborates that the email is actively used for professional purposes.\n\nIn summary, [jdoe@stack-ai.com](mailto:jdoe@stack-ai.com) originates from Stack AI and is used by Jane Doe, an AI Engineer at the company. The email is active and involved in standard business correspondence, as evidenced by both web and email search results[^55269.0.0][^55279.0.0].\n\nI am also sending you an email to confirm that I am actively looking into this matter." : null,
          },
        }
      })
    )
  }, [isRunMode, isRunning, openIOPanels, activeIOTabs, dismissedIOPanels, handleToggleIOPanel, setNodes])


  useEffect(() => {
    if (!isInitialized) {
      // Center the workflow nodes on the canvas
      // Position them at the center of the viewport (accounting for sidebar width ~44px)
      const viewportWidth = window.innerWidth - 44 // Subtract sidebar width
      const viewportHeight = window.innerHeight - 56 // Subtract top bar height
      const centerX = viewportWidth / 2 - 190 // Approximate center accounting for node width (380px)
      const centerY = viewportHeight / 2 - 100 // Approximate center accounting for node height
      const nodeSpacing = 450 // Space between nodes
      
      // Input node (left)
      const inputNodeData: WorkflowNodeData = {
        appName: "Input",
        actionName: "User Input",
        description: "Collect user input",
        type: "input",
        version: "v1.0.0",
        onDeleteNode: handleDeleteNode,
        onToggleIOPanel: handleToggleIOPanel,
      }
      
      const inputNode: Node = {
        id: "input-node",
        type: "workflowNode",
        position: { x: Math.max(0, centerX - nodeSpacing), y: Math.max(0, centerY) },
        data: inputNodeData,
      }
      
      // AI Agent node (middle)
      const aiAgentNodeData: WorkflowNodeData = {
        appName: "AI Agent",
        actionName: "LLM",
        description: "Process text using a large language model",
        type: "action",
        version: "v1.0.0",
        onDeleteNode: handleDeleteNode,
        onToggleIOPanel: handleToggleIOPanel,
      }
      
      const aiAgentNode: Node = {
        id: "ai-agent-node",
        type: "workflowNode",
        position: { x: Math.max(0, centerX), y: Math.max(0, centerY) },
        data: aiAgentNodeData,
      }
      
      // Send Email node (right)
      const sendEmailNodeData: WorkflowNodeData = {
        appName: "Send Email",
        actionName: "Send Email",
        description: "Send an email message",
        type: "action",
        version: "v1.0.0",
        onDeleteNode: handleDeleteNode,
        onToggleIOPanel: handleToggleIOPanel,
      }
      
      const sendEmailNode: Node = {
        id: "send-email-node",
        type: "workflowNode",
        position: { x: Math.max(0, centerX + nodeSpacing), y: Math.max(0, centerY) },
        data: sendEmailNodeData,
      }
      
      // Create edges connecting the nodes
      const initialEdges = [
        {
          id: "edge-input-to-ai",
          source: "input-node",
          target: "ai-agent-node",
          sourceHandle: "right",
          targetHandle: "left",
        },
        {
          id: "edge-ai-to-email",
          source: "ai-agent-node",
          target: "send-email-node",
          sourceHandle: "right",
          targetHandle: "left",
        },
      ]
      
      setNodes([inputNode, aiAgentNode, sendEmailNode])
      setEdges(initialEdges)
      setIsInitialized(true)
    }
  }, [isInitialized, setNodes, setEdges])

  return (
    <>
      <ContextMenu onOpenChange={handleContextMenuOpenChange}>
        <ContextMenuTrigger asChild>
          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onMouseMove={handleMouseMove}
            className="w-full h-full bg-[#F2F2F2]"
          >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
              onNodeClick={handleNodeClick}
              onPaneClick={handlePaneClick}
          nodeTypes={nodeTypes}
              defaultViewport={{ x: 0, y: 0, zoom: 0.85 }}
          className="bg-[#F2F2F2]"
          style={{ backgroundColor: '#F2F2F2' }}
        >
          <Background gap={20} size={1} />
        </ReactFlow>
      </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
            <ContextMenuItem onClick={handleAddNote}>
              <StickyNote className="mr-2 h-4 w-4" />
              <span>Add a note</span>
              <ContextMenuShortcut>⇧ N</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={handlePaste}>
              <Clipboard className="mr-2 h-4 w-4" />
              <span>Paste (1 node)</span>
              <ContextMenuShortcut>⌘ V</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuItem onClick={handleClearClipboard}>
              <ClipboardX className="mr-2 h-4 w-4" />
              <span>Clear Clipboard</span>
            </ContextMenuItem>
            <ContextMenuItem onClick={handleRun}>
              <Play className="mr-2 h-4 w-4" />
              <span>Run</span>
              <ContextMenuShortcut>⌘ ⏎</ContextMenuShortcut>
            </ContextMenuItem>
          </ContextMenuContent>
      </ContextMenu>
      <NodeSettingsSidebar
        isOpen={isSidebarOpen}
        onClose={() => {
          setIsSidebarOpen(false)
          setSelectedNodeData(null)
        }}
        nodeData={selectedNodeData}
        onNodeUpdate={handleNodeUpdate}
        onReplaceNode={(nodeId) => {
          // Replace node functionality removed
        }}
      />
      <RunProgress 
        nodes={nodes} 
        isRunning={isRunning}
        runStatus={isRunning ? "running" : isRunMode ? "success" : "success"}
        shouldExpand={shouldExpandRunProgress}
        onExpandChange={(expanded) => setShouldExpandRunProgress(expanded)}
      />
    </>
  )
}

export default function Page() {
  const actionSelectRef = React.useRef<((action: SelectedAction) => void) | null>(null)
  const runRef = React.useRef<(() => void) | null>(null)

  const handleActionSelect = (action: SelectedAction) => {
    if (actionSelectRef.current) {
      actionSelectRef.current(action)
    }
  }

  const handleRun = () => {
    if (runRef.current) {
      runRef.current()
    }
  }

  return (
    <DashboardLayout onActionSelect={handleActionSelect} onRun={handleRun}>
    <ReactFlowProvider>
        <FlowCanvas onActionSelectRef={actionSelectRef} onRunRef={runRef} />
    </ReactFlowProvider>
    </DashboardLayout>
  )
}
