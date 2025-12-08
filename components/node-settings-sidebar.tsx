"use client"

import { useState, useEffect } from "react"
import { X, RefreshCw, ChevronDown, Zap, Play } from "lucide-react"
import { AppIcon } from "./workflow-node"
import { appDetails, PROVIDERS, type ActionItem } from "@/lib/app-data"

interface NodeSettingsSidebarProps {
  isOpen: boolean
  onClose: () => void
  nodeData: {
    id: string
    appName: string
    actionName: string
    description: string
    type?: "trigger" | "action" | "input" | "output"
  } | null
  onNodeUpdate?: (
    nodeId: string,
    data: { appName: string; actionName: string; description: string; type: "trigger" | "action" | "input" | "output" },
  ) => void
  onReplaceNode?: (nodeId: string) => void
}

// List of AI providers - filter to only show providers that exist in appDetails
const getAIProviders = () => {
  const aiProviderNames = ["OpenAI", "Anthropic", "Google", "Cohere", "Hugging Face"]
  return aiProviderNames.filter(provider => PROVIDERS.includes(provider))
}

export function NodeSettingsSidebar({
  isOpen,
  onClose,
  nodeData,
  onNodeUpdate,
  onReplaceNode,
}: NodeSettingsSidebarProps) {
  const [selectedProvider, setSelectedProvider] = useState<string>("")
  const [selectedAction, setSelectedAction] = useState<string>("")
  const [providerOpen, setProviderOpen] = useState(false)
  const [actionOpen, setActionOpen] = useState(false)

  // Sync state with nodeData when it changes
  useEffect(() => {
    if (nodeData) {
      // Always set provider to OpenAI and disable dropdown
      setSelectedProvider("OpenAI")
      // Only set selectedAction if it's not empty (allows for unselected state)
      if (nodeData.actionName) {
        setSelectedAction(nodeData.actionName)
      } else {
        setSelectedAction("")
      }
    }
  }, [nodeData])

  if (!isOpen || !nodeData) return null

  const nodeSlug = `action-${nodeData.id.split("-").pop() || "0"}`
  // Always use OpenAI as the provider (dropdown is disabled)
  const providerDetails = appDetails["OpenAI"] || appDetails[selectedProvider]

  // Get current action/trigger description
  const getCurrentDescription = (): string => {
    if (!providerDetails) return nodeData.description

    // Check triggers
    const trigger = providerDetails.triggers.find((t) => t.name === selectedAction)
    if (trigger) return trigger.description

    // Check actions
    for (const group of providerDetails.actionGroups) {
      const action = group.items.find((a) => a.name === selectedAction)
      if (action) return action.description
    }

    return nodeData.description
  }

  // Handle provider change (disabled - always uses OpenAI)
  const handleProviderChange = (provider: string) => {
    // Provider dropdown is disabled, this function is no longer used
    // Always use OpenAI
    setSelectedProvider("OpenAI")
    setProviderOpen(false)

    // Reset action when provider changes
    const details = appDetails["OpenAI"] || appDetails[provider]
    if (details) {
      const firstAction = details.actionGroups[0]?.items[0] || details.triggers[0]
      if (firstAction) {
        setSelectedAction(firstAction.name)
        onNodeUpdate?.(nodeData.id, {
          appName: "OpenAI",
          actionName: firstAction.name,
          description: firstAction.description,
          type: details.triggers.some((t) => t.name === firstAction.name) ? "trigger" : "action",
        })
      }
    }
  }

  // Handle action/trigger change
  const handleActionChange = (action: ActionItem, type: "trigger" | "action") => {
    setSelectedAction(action.name)
    setActionOpen(false)
    onNodeUpdate?.(nodeData.id, {
      appName: "OpenAI", // Always use OpenAI as provider
      actionName: action.name,
      description: action.description,
      type,
    })
  }

  return (
    <div className="fixed top-14 right-0 bottom-0 w-[380px] bg-background border-l border-border shadow-lg z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 flex items-center justify-center">
            <AppIcon appName="OpenAI" className="w-5 h-5" />
          </div>
          <span className="font-semibold text-foreground truncate max-w-[160px]">
            {selectedAction || "Select an action"}
          </span>
          <span className="px-2 py-0.5 text-xs font-mono bg-muted rounded-md text-muted-foreground">{nodeSlug}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              if (nodeData && onReplaceNode) {
                onReplaceNode(nodeData.id)
              }
            }}
            className="p-1.5 rounded-md hover:bg-muted transition-colors"
            title="Replace node"
          >
            <RefreshCw className="w-4 h-4 text-muted-foreground" />
          </button>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Description */}
        <p className="text-sm text-muted-foreground">
          {selectedAction ? getCurrentDescription() : "Select an action to configure this node"}
        </p>

        {/* Provider Dropdown */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground border-b border-dashed border-muted-foreground/50 pb-0.5">
            Provider
          </label>
          <div className="relative">
            <button
              disabled
              className="w-full flex items-center justify-between px-3 py-2.5 border border-border rounded-lg bg-background hover:bg-muted/50 transition-colors cursor-default"
              onClick={(e) => e.preventDefault()}
            >
              <div className="flex items-center gap-2.5">
                <AppIcon appName="OpenAI" className="w-5 h-5" />
                <span className="text-sm text-foreground">OpenAI</span>
              </div>
              <ChevronDown
                className="w-4 h-4 text-muted-foreground"
              />
            </button>
          </div>
        </div>

        {/* Model Dropdown */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground border-b border-dashed border-muted-foreground/50 pb-0.5">
            Model
          </label>
          <div className="relative">
            <button
              onClick={() => setActionOpen(!actionOpen)}
              className="w-full flex items-center justify-between px-3 py-2.5 border border-border rounded-lg bg-background hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                {selectedAction ? (
                  <>
                    <AppIcon appName="OpenAI" className="w-5 h-5" />
                    <span className="text-sm text-foreground">{selectedAction}</span>
                  </>
                ) : (
                  <span className="text-sm text-muted-foreground">Select an action</span>
                )}
              </div>
              <ChevronDown
                className={`w-4 h-4 text-muted-foreground transition-transform ${actionOpen ? "rotate-180" : ""}`}
              />
            </button>

            {actionOpen && providerDetails && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-lg shadow-lg z-10 max-h-[300px] overflow-y-auto">
                {/* Triggers */}
                {providerDetails.triggers.length > 0 && (
                  <div>
                    <div className="px-3 py-1.5 flex items-center gap-2 text-xs text-muted-foreground font-medium bg-muted/30 sticky top-0">
                      <Zap className="w-3 h-3" />
                      Triggers
                    </div>
                    {providerDetails.triggers.map((trigger) => (
                      <button
                        key={trigger.name}
                        onClick={() => handleActionChange(trigger, "trigger")}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-muted/50 transition-colors ${
                          trigger.name === selectedAction ? "bg-muted" : ""
                        }`}
                      >
                        <AppIcon appName="OpenAI" className="w-4 h-4" />
                        <span className="text-sm text-foreground">{trigger.name}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Actions grouped */}
                {providerDetails.actionGroups.length > 0 && (
                  <div>
                    <div className="px-3 py-1.5 flex items-center gap-2 text-xs text-muted-foreground font-medium bg-muted/30 sticky top-0">
                      <Play className="w-3 h-3" />
                      Actions
                    </div>
                    {providerDetails.actionGroups.map((group) => (
                      <div key={group.name}>
                        <div className="px-3 py-1 text-xs text-muted-foreground bg-muted/10">{group.name}</div>
                        {group.items.map((action) => (
                          <button
                            key={action.name}
                            onClick={() => handleActionChange(action, "action")}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-muted/50 transition-colors ${
                              action.name === selectedAction ? "bg-muted" : ""
                            }`}
                          >
                            <AppIcon appName="OpenAI" className="w-4 h-4" />
                            <span className="text-sm text-foreground">{action.name}</span>
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
