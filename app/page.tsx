"use client"

import React, { useState, useEffect, useRef, useCallback, Suspense } from "react"
import { ReactFlow, Background, ReactFlowProvider, useNodesState, useEdgesState, useReactFlow } from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { DashboardLayout } from "@/components/dashboard-layout"
import WorkflowNode from "@/components/workflow-node"
import { NodeSettingsSidebar } from "@/components/node-settings-sidebar"
import { RunProgress } from "@/components/run-progress"
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuShortcut, ContextMenuTrigger } from "@/components/ui/context-menu"
import { Alert } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Play, StickyNote, Clipboard, ClipboardX, AlertCircle, Bot, X, Copy, Crosshair } from "lucide-react"
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
  const [shouldExpandRunProgress, setShouldExpandRunProgress] = useState(true)
  const [activeRunId, setActiveRunId] = useState(() =>
    typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `run-${Date.now()}`,
  )
  const [runStatusResult, setRunStatusResult] = useState<"success" | "error">("success")
  const [runErrorDismissed, setRunErrorDismissed] = useState(false)
  const [runErrorMessage] = useState("Error in Node Send Reply (send-reply-node): Email delivery failed. Check SMTP configuration, recipient address, or rate limits and try again.")
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
    setRunErrorDismissed(false)
    setActiveRunId(
      typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `run-${Date.now()}`,
    )
    
    // After a short delay, stop loading
    setTimeout(() => {
      setIsLoading(false)
    }, 500) // Loading animation for 500ms
    
    // After run completes, show success
    setTimeout(() => {
      setIsRunning(false)
      setIsRunMode(true)
      setRunStatusResult("success")
      // Show notification dot on output buttons
      const defaultTabs = new Map(nodes.map(n => [n.id, "output" as const]))
      setActiveIOTabs(defaultTabs)
    }, 5000) // Run for 5 seconds (matches Gantt animation duration)
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
              source: "email",
              from: "sarah.chen@example.com",
              subject: "Charged twice — still no response",
              message: "I was charged twice for my Pro subscription this month. This is the third time I've reached out with no response.",
              ticket_id: "TKT-20481",
              timestamp: new Date().toISOString(),
            } : null,
            output: isRunMode && !isCleared ? (() => {
              const action = nodeData.actionName
              const isIntentClassifier = action === "Intent Classifier"
              const isKbLookup = action === "Knowledge Base Lookup"
              const isDraftResponse = action === "Draft Response"
              const isLegacyAgent = nodeData.appName === "AI Agent" && action === "LLM"
              const customerMsg =
                "I was charged twice for my Pro subscription this month. This is the third time I've reached out with no response."

              const classifyTool = {
                action_id: "classify_intent",
                params: { message: customerMsg },
                output: {
                  type: "json",
                  message: {
                    intent: "billing_dispute",
                    priority: "high",
                    sentiment: "frustrated",
                    confidence: 0.97,
                  },
                  meta: null,
                  save_as: "",
                },
              }
              const searchTool = {
                action_id: "search_kb",
                params: { query: "duplicate charge billing dispute refund policy" },
                output: {
                  type: "json",
                  message: {
                    results: [
                      {
                        title: "Billing FAQ — Duplicate Charges",
                        snippet:
                          "If you see a duplicate charge, our team can issue a full refund within 3–5 business days. Contact support with your invoice number.",
                      },
                      {
                        title: "Refund Policy",
                        snippet:
                          "All billing disputes are reviewed within 24 hours. Refunds are processed to the original payment method and confirmed via email.",
                      },
                    ],
                  },
                  meta: null,
                  save_as: "",
                },
              }
              const ticketTool = {
                action_id: "check_ticket_history",
                params: { user_email: "sarah.chen@example.com", limit: 5 },
                output: {
                  type: "json",
                  message: { tickets: [{ id: "TKT-20481", status: "open", replies: 3 }] },
                  meta: null,
                  save_as: "",
                },
              }
              const draftCompletion =
                "Hi Sarah,\n\nThank you for reaching out, and I sincerely apologize for the frustration — being charged twice and not hearing back is not the experience we want for you.\n\nI've flagged this as a **high-priority billing dispute**. A full refund for the duplicate charge will be processed to your original payment method within **3–5 business days**, and you'll receive a confirmation email once it's issued.\n\nIf you don't see the refund after 5 business days, please reply here and we'll escalate directly to our billing team.\n\nApologies again for the inconvenience.\n\nBest,\nSupport Team"

              if (isIntentClassifier || isKbLookup || isDraftResponse || isLegacyAgent) {
                const tool_invocations = isIntentClassifier
                  ? [classifyTool]
                  : isKbLookup
                    ? [searchTool]
                    : [classifyTool, searchTool, ticketTool]
                return {
                  status: "success",
                  message: "Request completed successfully",
                  timestamp: new Date().toISOString(),
                  data: {
                    tool_invocations,
                    formatted_prompt:
                      "system:\nYou are a helpful customer support agent.\n\nprompt:\nCustomer message (ticket TKT-20481):\n\"" +
                      customerMsg +
                      "\"\n",
                    provider: { name: "OpenAI", model: "gpt-4.1" },
                    params: {
                      temperature: 0.2,
                      top_p: 1,
                      n: 1,
                      stream: true,
                      logit_bias: {},
                      stop: null,
                      max_tokens: 1000,
                      frequency_penalty: 0,
                      presence_penalty: 0,
                      response_format: "text",
                      json_schema: null,
                      use_reasoning: false,
                      reasoning_effort: null,
                      safe_context_token_window: false,
                      seed: 42,
                    },
                    completion: isDraftResponse || isLegacyAgent ? draftCompletion : "",
                    citations: [],
                  },
                }
              } else {
                // For other nodes, use the original structure
                return {
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
                }
              }
            })() : null,
            completion: isRunMode && !isCleared ? (() => {
              const action = nodeData.actionName
              if (action === "Intent Classifier") {
                return '{"intent":"billing_dispute","priority":"high","sentiment":"frustrated","confidence":0.97}\n\nClassification complete. Routing to Knowledge Base Lookup.'
              }
              if (action === "Knowledge Base Lookup") {
                return "Retrieved 2 documents: Billing FAQ — Duplicate Charges, Refund Policy. Confidence: 0.93."
              }
              if (action === "Draft Response" || (nodeData.appName === "AI Agent" && action === "LLM")) {
                return "Hi Sarah,\n\nThank you for reaching out, and I sincerely apologize for the frustration — being charged twice and not hearing back is not the experience we want for you.\n\nI've flagged this as a **high-priority billing dispute**. A full refund for the duplicate charge will be processed to your original payment method within **3–5 business days**, and you'll receive a confirmation email once it's issued.\n\nIf you don't see the refund after 5 business days, please reply here and we'll escalate directly to our billing team.\n\nApologies again for the inconvenience.\n\nBest,\nSupport Team"
              }
              return "Ticket **TKT-20481** has been updated and linked to sarah.chen@example.com. Reply sent successfully via email. CRM record updated with resolution status: **pending_refund**. Escalation flag: billing team notified. KB articles referenced: Billing FAQ — Duplicate Charges, Refund Policy."
            })() : null,
          },
        }
      })
    )
  }, [isRunMode, isRunning, openIOPanels, activeIOTabs, dismissedIOPanels, handleToggleIOPanel, setNodes])


  useEffect(() => {
    if (!isInitialized) {
      const dx = 260
      const x0 = 60
      const yTop = 40
      const yEmail = 220
      const yLane = 130

      const mk = (partial: WorkflowNodeData): WorkflowNodeData => ({
        version: "v1.0.0",
        onDeleteNode: handleDeleteNode,
        onToggleIOPanel: handleToggleIOPanel,
        ...partial,
      })

      const chatbotNode: Node = {
        id: "chatbot-node",
        type: "workflowNode",
        position: { x: x0, y: yTop },
        data: mk({
          appName: "Trigger",
          actionName: "Chatbot Input",
          description: "Customer sends a message via the embedded chatbot widget",
          type: "input",
        }),
      }

      const emailTriggerNode: Node = {
        id: "email-trigger-node",
        type: "workflowNode",
        position: { x: x0, y: yEmail },
        data: mk({
          appName: "Trigger",
          actionName: "Receive Email",
          description: "Inbound support email received in the connected inbox",
          type: "input",
        }),
      }

      const emailPrepNode: Node = {
        id: "email-prep-node",
        type: "workflowNode",
        position: { x: x0 + dx, y: yEmail },
        data: mk({
          appName: "Email",
          actionName: "Email Preprocessing",
          description: "Parse headers, extract intent, and attach the message to a ticket",
          type: "action",
        }),
      }

      const intentNode: Node = {
        id: "intent-classifier-node",
        type: "workflowNode",
        position: { x: x0 + dx * 2, y: yLane },
        data: mk({
          appName: "AI Agent",
          actionName: "Intent Classifier",
          description: "Classifies intent, priority, and sentiment from the normalized message",
          type: "action",
        }),
      }

      const kbNode: Node = {
        id: "kb-lookup-node",
        type: "workflowNode",
        position: { x: x0 + dx * 3, y: yLane },
        data: mk({
          appName: "Knowledge Base",
          actionName: "Knowledge Base Lookup",
          description: "Retrieves top-k articles relevant to the ticket",
          type: "action",
        }),
      }

      const draftNode: Node = {
        id: "draft-response-node",
        type: "workflowNode",
        position: { x: x0 + dx * 4, y: yLane },
        data: mk({
          appName: "AI Agent",
          actionName: "Draft Response",
          description: "Drafts an empathetic reply using KB context and ticket history",
          type: "action",
        }),
      }

      const ifelseNode: Node = {
        id: "ifelse-node",
        type: "workflowNode",
        position: { x: x0 + dx * 5, y: yLane },
        data: mk({
          appName: "Logic",
          actionName: "If / Else",
          description: "Branches on policy rules (refund initiated, escalation thresholds)",
          type: "action",
        }),
      }

      const crmNode: Node = {
        id: "crm-node",
        type: "workflowNode",
        position: { x: x0 + dx * 6, y: yLane },
        data: mk({
          appName: "Integrations",
          actionName: "Update CRM Record",
          description: "Updates ticket and customer record in the CRM",
          type: "action",
        }),
      }

      const escalationNode: Node = {
        id: "escalation-router-node",
        type: "workflowNode",
        position: { x: x0 + dx * 7, y: yLane },
        data: mk({
          appName: "Routing",
          actionName: "Escalation Router",
          description: "Decides whether to escalate to a human team or continue automation",
          type: "action",
        }),
      }

      const sendEmailNode: Node = {
        id: "send-email-node",
        type: "workflowNode",
        position: { x: x0 + dx * 8, y: yLane },
        data: mk({
          appName: "Send Reply",
          actionName: "Send Reply",
          description: "Sends the drafted response back to the customer via email or chatbot",
          type: "action",
        }),
      }

      const outputNode: Node = {
        id: "output-node",
        type: "workflowNode",
        position: { x: x0 + dx * 9, y: yLane },
        data: mk({
          appName: "Output",
          actionName: "Output",
          description: "Run completion payload, metrics, and token usage",
          type: "output",
        }),
      }

      const initialEdges = [
        { id: "e-chat-intent", source: "chatbot-node", target: "intent-classifier-node", sourceHandle: "right", targetHandle: "left" },
        { id: "e-email-prep", source: "email-trigger-node", target: "email-prep-node", sourceHandle: "right", targetHandle: "left" },
        { id: "e-prep-intent", source: "email-prep-node", target: "intent-classifier-node", sourceHandle: "right", targetHandle: "left" },
        { id: "e-intent-kb", source: "intent-classifier-node", target: "kb-lookup-node", sourceHandle: "right", targetHandle: "left" },
        { id: "e-kb-draft", source: "kb-lookup-node", target: "draft-response-node", sourceHandle: "right", targetHandle: "left" },
        { id: "e-draft-if", source: "draft-response-node", target: "ifelse-node", sourceHandle: "right", targetHandle: "left" },
        { id: "e-if-crm", source: "ifelse-node", target: "crm-node", sourceHandle: "right", targetHandle: "left" },
        { id: "e-crm-esc", source: "crm-node", target: "escalation-router-node", sourceHandle: "right", targetHandle: "left" },
        { id: "e-esc-send", source: "escalation-router-node", target: "send-email-node", sourceHandle: "right", targetHandle: "left" },
        { id: "e-send-out", source: "send-email-node", target: "output-node", sourceHandle: "right", targetHandle: "left" },
      ]

      setNodes([
        chatbotNode,
        emailTriggerNode,
        emailPrepNode,
        intentNode,
        kbNode,
        draftNode,
        ifelseNode,
        crmNode,
        escalationNode,
        sendEmailNode,
        outputNode,
      ])
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
          fitView
          fitViewOptions={{ padding: 0.3 }}
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
        edges={edges}
        isRunning={isRunning}
        runStatus={isRunning ? "running" : runStatusResult}
        shouldExpand={shouldExpandRunProgress}
        onExpandChange={(expanded) => setShouldExpandRunProgress(expanded)}
        runId={activeRunId}
      />
      {/* Run error banner - fixed below top bar (h-14 = 56px) */}
      {runStatusResult === "error" && !runErrorDismissed && (
        <div className="fixed left-0 right-0 top-14 z-50 px-4 py-2">
          <Alert variant="destructive" className="rounded-lg border-destructive/50 bg-destructive/5 [&>svg]:text-destructive">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <div className="col-start-2 flex flex-1 items-center justify-between gap-4 min-w-0">
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-destructive">Run error</div>
                <div className="text-destructive/90 text-sm mt-0.5 truncate" title={runErrorMessage}>
                  {runErrorMessage}
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Button size="sm" variant="outline" className="gap-2 border-destructive/40 bg-destructive/5 text-destructive hover:bg-destructive/10 hover:border-destructive/60">
                  <Bot className="h-3.5 w-3.5" />
                  Ask AI
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => navigator.clipboard.writeText(runErrorMessage)} title="Copy">
                  <Copy className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/10" title="Locate">
                  <Crosshair className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => setRunErrorDismissed(true)} title="Dismiss">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Alert>
        </div>
      )}
    </>
  )
}

function PageInner() {
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

export default function Page() {
  return (
    <Suspense>
      <PageInner />
    </Suspense>
  )
}
