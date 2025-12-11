"use client"

import type React from "react"
import { memo } from "react"
import { type NodeProps, useReactFlow } from "@xyflow/react"
import { Clock, MoreVertical, Pencil, FileText, Zap, Link, Mic, Play, Box, BookOpen, Code, Wrench, RefreshCw, CheckCircle2, Upload, Loader2, Database, Layers3, Snowflake } from "lucide-react"
import SlackIconComponent from "./SlackIcon"
import StackAIIcon from "./StackAIIcon"
import AnthropicIcon from "./AnthropicIcon"
import AirtableIcon from "./AirtableIcon"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Trash2 } from "lucide-react"
import { NodeHandles } from "./node-handles"
import { NodeIOPanel } from "./node-io-panel"
import { ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { WorkflowNodeData } from "@/lib/types"

export function AppIcon({ appName, className }: { appName: string; className?: string }) {
  const iconMap: Record<string, React.ReactNode> = {
    slack: <SlackIconComponent className={className} />,
    stackai: <StackAIIcon className={className} />,
    airtable: <AirtableIcon className={className} />,
    anthropic: <AnthropicIcon className={className} />,
    input: <Pencil className={className} />,
    output: <Pencil className={className} />,
    files: <FileText className={className} />,
    trigger: <Zap className={className} />,
    url: <Link className={className} />,
    audio: <Mic className={className} />,
    action: <Play className={className} />,
    template: <FileText className={className} />,
    "ai agent": <Box className={className} />,
    "knowledge base": <BookOpen className={className} />,
    condition: <Code className={className} />,
    loop: <Code className={className} />,
    switch: <Code className={className} />,
    code: <Code className={className} />,
    delay: <Wrench className={className} />,
    "http request": <Wrench className={className} />,
  }

  const name = appName.toLowerCase()
  return iconMap[name] ?? <div className={`bg-muted rounded ${className}`} />
}

export function getNodeIconBg(appName: string): string {
  const name = appName.toLowerCase()

  const colorMap: Record<string, string> = {
    // Apps - amber
    slack: "border-amber-200 bg-amber-50",
    stackai: "border-amber-200 bg-amber-50",
    airtable: "border-amber-200 bg-amber-50",
    anthropic: "border-amber-200 bg-amber-50",
    // Inputs - blue
    input: "border-blue-200 bg-blue-50",
    files: "border-blue-200 bg-blue-50",
    trigger: "border-blue-200 bg-blue-50",
    url: "border-blue-200 bg-blue-50",
    audio: "border-blue-200 bg-blue-50",
    // Outputs - green
    output: "border-green-200 bg-green-50",
    action: "border-green-200 bg-green-50",
    template: "border-green-200 bg-green-50",
    // Core - purple
    "ai agent": "border-purple-200 bg-purple-50",
    "knowledge base": "border-purple-200 bg-purple-50",
    // Logic - orange
    condition: "border-orange-200 bg-orange-50",
    loop: "border-orange-200 bg-orange-50",
    switch: "border-orange-200 bg-orange-50",
    // Utils - gray
    delay: "border-gray-200 bg-gray-50",
    "http request": "border-gray-200 bg-gray-50",
    code: "border-gray-200 bg-gray-50",
  }

  return colorMap[name] ?? "border-amber-200 bg-amber-50"
}

function WorkflowNode({ data, id }: NodeProps) {
  const nodeData = data as WorkflowNodeData
  const {
    appName,
    actionName,
    description,
    type,
    version = "v1.0.0",
    onReplaceNode,
    onHandleClick,
    onDeleteNode,
    isRunMode = false,
    isRunning = false,
    isIOPanelOpen = false,
    activeIOTab = "input",
    isOutputDismissed = false,
    isCompletionDismissed = false,
    onToggleIOPanel,
    onClearOutput,
    onPinChange,
    input,
    output,
    completion,
  } = nodeData

  const { getNode } = useReactFlow()

  const handleHandleClick = (side: "left" | "right", e: React.MouseEvent) => {
    e.stopPropagation()
    // Store the source node ID and side for when an action is selected
    ;(window as any).__handleClickSourceNode = { nodeId: id, side }
    
    if (onHandleClick) {
    const node = getNode(id as string)
    if (node) {
      const rect = e.currentTarget.getBoundingClientRect()
      const position = {
          x: side === "right" ? rect.right + 50 : rect.left - 10,
          y: rect.top - 100,
      }
        onHandleClick(side, position)
      }
    }
  }

  const handleReplaceNode = (e: React.MouseEvent) => {
    e.stopPropagation()
      // Store that we're replacing this node
      ;(window as any).__replaceNodeId = id
    // Replace node functionality removed
  }

  const handleDeleteNode = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDeleteNode?.(id)
  }

  const iconBg = getNodeIconBg(appName)

  const handleToggleIOPanel = (tab?: "output" | "completion") => {
    if (onToggleIOPanel) {
      onToggleIOPanel(id as string, tab)
    }
  }

  const handleOutputClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    // Toggle: if panel is open with output tab, close it; otherwise open it
    if (onToggleIOPanel) {
      if (isIOPanelOpen && activeIOTab === "output") {
        // Close the panel
        onToggleIOPanel(id as string)
      } else {
        // Open panel with output tab
        onToggleIOPanel(id as string, "output")
      }
    }
  }

  const handleCompletionClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    // Toggle: if panel is open with completion tab, close it; otherwise open it
    if (onToggleIOPanel) {
      if (isIOPanelOpen && activeIOTab === "completion") {
        // Close the panel
        onToggleIOPanel(id as string)
      } else {
        // Open panel with completion tab
        onToggleIOPanel(id as string, "completion")
      }
    }
  }

  return (
    <div className="flex flex-col relative">
      {/* Status badge - appears when running or in run mode, positioned absolutely above the card */}
      {(isRunning || isRunMode) && (
        <div className="absolute -top-8 right-6" style={{ width: '380px' }}>
          <div className="flex justify-end">
            {isRunning ? (
              <div className="bg-purple-50 border border-purple-200 rounded-md px-2 py-1 flex items-center gap-1.5 shadow-sm">
                <Loader2 className="w-3.5 h-3.5 text-purple-600 animate-spin" />
                <span className="text-xs font-medium text-purple-700">Running</span>
              </div>
            ) : (
              <div className="bg-green-50 border border-green-200 rounded-md px-2 py-1 flex items-center gap-1.5 shadow-sm">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                <span className="text-xs font-medium text-green-700">Success</span>
              </div>
            )}
          </div>
        </div>
      )}
    <NodeHandles onLeftClick={(e) => handleHandleClick("left", e)} onRightClick={(e) => handleHandleClick("right", e)}>
        <div className="relative">
      <ContextMenu>
        <ContextMenuTrigger asChild>
          {/* Main card */}
              <div className={`bg-card rounded-xl w-[380px] transition-all overflow-hidden border border-border/50 ${
                isRunning 
                  ? "shadow-[0_0_0_3px_rgba(168,85,247,0.15)]" 
                  : isRunMode 
                    ? "shadow-[0_0_0_3px_rgba(34,197,94,0.15)]" 
                    : "shadow-sm"
              }`}>
                {appName === "AI Agent" && actionName === "LLM" ? (
                  <div className="p-4">
                    {/* Custom LLM Layout */}
                    <div className="flex items-center gap-3 mb-3 relative">
                      {/* OpenAI Logo */}
                      <div className="w-8 h-8 flex items-center justify-center flex-shrink-0 border border-border rounded">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-foreground">
                          <path d="M12 2L2 7l10 5 10-5-10-5z" />
                          <path d="M2 17l10 5 10-5" />
                          <path d="M2 12l10 5 10-5" />
                        </svg>
                      </div>
                      <h3 className="text-base font-semibold text-foreground">AI Agent</h3>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="absolute right-0 p-1 rounded-md hover:bg-muted transition-colors flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                            <MoreVertical className="w-4 h-4 text-muted-foreground" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={handleReplaceNode}>
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Replace
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={handleDeleteNode} className="text-destructive focus:text-destructive">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* GPT 4.1 Box */}
                    <div className="bg-muted/50 rounded-lg p-3 flex items-center gap-2 mb-3">
                      <Database className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground">GPT 4.1</span>
                    </div>

                    {/* Knowledge Base and Tools Section */}
                    <div className="flex items-start justify-between w-full">
                      {/* Knowledge Base Section */}
                      <div className="flex flex-col">
                        <span className="text-sm text-muted-foreground mb-2">knowledge base</span>
                        <TooltipProvider>
                          <div className="flex items-center -space-x-2">
                            {/* Database icons */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="w-8 h-8 rounded-full bg-muted border-2 border-background flex items-center justify-center relative z-[3] cursor-pointer">
                                  <Database className="w-4 h-4 text-muted-foreground" />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent className="bg-white text-gray-900 border border-gray-200" hideArrow>
                                <p>Knowledge Base 1</p>
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="w-8 h-8 rounded-full bg-muted border-2 border-background flex items-center justify-center relative z-[2] cursor-pointer">
                                  <Database className="w-4 h-4 text-muted-foreground" />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent className="bg-white text-gray-900 border border-gray-200" hideArrow>
                                <p>Knowledge Base 2</p>
                              </TooltipContent>
                            </Tooltip>
                            {/* +4 badge */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="w-8 h-8 rounded-full bg-muted border-2 border-background flex items-center justify-center relative z-[1] cursor-pointer">
                                  <span className="text-xs font-medium text-muted-foreground">+4</span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent className="bg-white text-gray-900 border border-gray-200" hideArrow>
                                <p>4 more knowledge bases</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </TooltipProvider>
                      </div>

                      {/* Tools Section */}
                      <div className="flex flex-col items-end">
                        <span className="text-sm text-muted-foreground mb-2">Tools</span>
                        <TooltipProvider>
                          <div className="flex items-center -space-x-2">
                            {/* 3D cubes */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="w-8 h-8 rounded-full bg-muted border-2 border-background flex items-center justify-center relative z-[2] cursor-pointer">
                                  <Layers3 className="w-4 h-4 text-muted-foreground" />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent className="bg-white text-gray-900 border border-gray-200" hideArrow>
                                <p>Layers Tool</p>
                              </TooltipContent>
                            </Tooltip>
                            {/* Snowflake */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="w-8 h-8 rounded-full bg-muted border-2 border-background flex items-center justify-center relative z-[1] cursor-pointer">
                                  <div className="w-5 h-5 bg-blue-400 rounded-full flex items-center justify-center">
                                    <Snowflake className="w-3 h-3 text-white" />
                                  </div>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent className="bg-white text-gray-900 border border-gray-200" hideArrow>
                                <p>Snowflake</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </TooltipProvider>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4">
                    {/* Default Header */}
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-8 h-8 rounded-lg border border-border flex items-center justify-center flex-shrink-0 ${
                type === "input" ? "bg-white" : "bg-muted"
              }`}>
                <AppIcon appName={appName} className="w-4 h-4" />
              </div>
              <span className="text-base font-semibold text-foreground flex-1">{actionName}</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-1 rounded-md hover:bg-muted transition-colors" onClick={(e) => e.stopPropagation()}>
                    <MoreVertical className="w-4 h-4 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={handleReplaceNode}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Replace
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleDeleteNode}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Description */}
            <p className="text-sm text-muted-foreground mb-3 leading-relaxed bg-gray-50 px-2 py-1 rounded inline-block">{actionName === "User Input" && description === "Collect user input" ? "real madrid" : description}</p>
                  </div>
                )}

                {/* Footer with Output and Completion tabs - only show for action nodes, not input nodes */}
                {type !== "input" && (
                <div 
                  className="bg-muted/30 px-4 pt-2 pb-0 border-t border-border/50 flex items-center gap-6 relative" 
                  data-node-footer
                  onClick={(e) => {
                    // If clicking on the footer itself (not on a button), open the rightmost tab (Output)
                    const target = e.target as HTMLElement
                    if (target === e.currentTarget || !target.closest('button')) {
                      e.stopPropagation()
                      handleOutputClick(e)
                    }
                  }}
                >
                  {/* Only show Completion tab for AI Agent nodes */}
                  {appName === "AI Agent" && actionName === "LLM" && (
                    <button
                      type="button"
                      className={`relative text-sm font-normal transition-colors cursor-pointer leading-none pb-2.5 border-b-2 ${
                        isIOPanelOpen && activeIOTab === "completion" 
                          ? "text-foreground border-gray-400" 
                          : "text-muted-foreground hover:text-foreground border-transparent"
                      }`}
                      onClick={handleCompletionClick}
                    >
                      <span className="relative inline-block">
                        Completion
                        {isRunMode && !isIOPanelOpen && !isCompletionDismissed && (
                          <span className="absolute top-0 -right-1.5 w-1.5 h-1.5 bg-black rounded-full border border-gray-300" />
                        )}
                      </span>
                    </button>
                  )}
                  <button
                    type="button"
                    className={`relative text-sm font-normal transition-colors cursor-pointer leading-none pb-2.5 border-b-2 ${
                      isIOPanelOpen && activeIOTab === "output" 
                        ? "text-foreground border-gray-400" 
                        : "text-muted-foreground hover:text-foreground border-transparent"
                    }`}
                    onClick={handleOutputClick}
                  >
                    <span className="relative inline-block">
                      Output
                      {isRunMode && !isIOPanelOpen && !isOutputDismissed && (
                        <span className="absolute top-0 -right-1.5 w-1.5 h-1.5 bg-black rounded-full border border-gray-300" />
                      )}
                    </span>
                  </button>
            </div>
                )}
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={handleReplaceNode}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Replace
          </ContextMenuItem>
          <ContextMenuItem onClick={handleDeleteNode} variant="destructive">
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
        </div>
    </NodeHandles>
      
      {/* IO Panel - appears below the node when open */}
      {isIOPanelOpen && (
        <div className="mx-6 mt-1.5">
          <NodeIOPanel
            nodeId={id as string}
            activeTab={activeIOTab === "output" || activeIOTab === "completion" ? activeIOTab : "output"}
            onClose={handleToggleIOPanel}
            onClear={onClearOutput}
            onPinChange={onPinChange}
            input={input}
            output={output}
            completion={completion}
            appName={appName}
            actionName={actionName}
          />
        </div>
      )}
    </div>
  )
}

export default memo(WorkflowNode)
