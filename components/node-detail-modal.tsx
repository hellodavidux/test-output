"use client"

import React, { useState, useRef, useEffect } from "react"
import { createPortal } from "react-dom"
import { X, Copy, Download, Trash2, Search, ChevronDown, ChevronUp, Settings, FileText, Building2, Code2, AlertCircle, Bot, ArrowLeft, ArrowRight } from "lucide-react"
import { AppIcon } from "./workflow-node"
import { Button } from "@/components/ui/button"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CollapsibleJsonView } from "@/components/collapsible-json"
import type { Node, Edge } from "@xyflow/react"

interface NodeDetailModalProps {
  node: Node | null
  onClose: () => void
  initialTab?: "input" | "output" | "completion" | "metadata" | "tools" | "context"
  initialViewMode?: "text" | "formatted" | "code"
  showRunProgress?: boolean
  runProgressComponent?: React.ReactNode
  onRunProgressClose?: () => void
  nodes?: Node[]
  edges?: Edge[]
}

export function NodeDetailModal({ node, onClose, initialTab = "output", initialViewMode = "formatted", showRunProgress = false, runProgressComponent, onRunProgressClose, nodes = [], edges = [] }: NodeDetailModalProps) {
  // For input nodes, always use "input" tab, for LLM nodes default to "completion" if not specified, otherwise use the provided initialTab
  const getInitialTab = () => {
    if (!node) return initialTab || "output"
    const nodeData = node.data as any
    if (nodeData?.type === "input") {
      return "input"
    }
    // For LLM nodes, always default to completion (override default "output")
    if (nodeData?.appName === "AI Agent" && nodeData?.actionName === "LLM") {
      // If initialTab is the default "output", use "completion" instead
      // Otherwise use the provided initialTab
      return initialTab === "output" ? "completion" : (initialTab || "completion")
    }
    return initialTab || "output"
  }
  
  const [activeTab, setActiveTab] = useState<"input" | "output" | "completion" | "metadata" | "tools" | "context">(getInitialTab())
  const [viewMode, setViewMode] = useState<"text" | "formatted" | "code">(initialViewMode)
  
  // Update activeTab when initialTab changes (when modal opens with different tab)
  useEffect(() => {
    if (!node) return
    const nodeData = node.data as any
    const isInput = nodeData?.type === "input"
    const isAIAgent = nodeData?.appName === "AI Agent" && nodeData?.actionName === "LLM"
    
    if (isInput) {
      setActiveTab("input")
    } else if (isAIAgent) {
      // For LLM nodes, default to completion tab (override default "output")
      // If initialTab is the default "output", use "completion" instead
      setActiveTab(initialTab === "output" ? "completion" : (initialTab || "completion"))
    } else if (initialTab) {
      setActiveTab(initialTab)
    }
  }, [initialTab, node])

  // Update viewMode when initialViewMode changes (when modal opens with different view mode)
  useEffect(() => {
    if (initialViewMode) {
      setViewMode(initialViewMode)
    }
  }, [initialViewMode])
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set(["tool_invocations", "Tool Invocations", "llm-input-in-0", "completion-content"]))
  const [searchQuery, setSearchQuery] = useState("")
  const [mounted, setMounted] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)
  const inputTabRef = useRef<HTMLButtonElement>(null)
  const completionTabRef = useRef<HTMLButtonElement>(null)
  const outputTabRef = useRef<HTMLButtonElement>(null)
  const metadataTabRef = useRef<HTMLButtonElement>(null)
  const toolsTabRef = useRef<HTMLButtonElement>(null)
  const contextTabRef = useRef<HTMLButtonElement>(null)
  const [indicatorStyle, setIndicatorStyle] = useState<{ left: number; width: number }>({ left: 0, width: 0 })

  // Ensure we only render portal on client side
  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  // Get node data
  const nodeData = node?.data as any
  const appName = nodeData?.appName || "Unknown"
  const actionName = nodeData?.actionName || "Node"
  const type = nodeData?.type || "action"
  const isAIAgent = appName === "AI Agent" || appName.toLowerCase().includes("ai agent")
  const isInputNode = type === "input"

  const input = nodeData?.input
  const output = nodeData?.output
  // For LLM nodes, check multiple locations for completion:
  // 1. output.data.completion (preferred for LLM nodes)
  // 2. nodeData.completion (direct completion field)
  // 3. output.completion (fallback)
  let completion: any = null
  if (isAIAgent) {
    completion = output?.data?.completion ?? nodeData?.completion ?? output?.completion ?? null
  } else {
    completion = nodeData?.completion ?? output?.completion ?? null
  }
  // Extract metadata and tools from output data for LLM nodes
  // Metadata includes the full output.data structure with tool_invocations, formatted_prompt, provider, params, completion, citations
  const metadata = isAIAgent && output?.data ? output.data : null
  const tools = isAIAgent && output?.data?.tool_invocations ? output.data.tool_invocations : (isAIAgent && output?.tool_invocations ? output.tool_invocations : null)

  // Reset view mode when switching tabs (removed completion restriction to allow formatted view)

  // Handle input node - ensure it shows input tab
  useEffect(() => {
    if (node && (node.data as any)?.type === "input" && activeTab !== "input") {
      setActiveTab("input")
    }
  }, [activeTab, node])

  // Calculate sliding indicator position
  useEffect(() => {
    if (!mounted || !node) return
    
    const updateIndicator = () => {
      let activeRef: typeof inputTabRef | typeof completionTabRef | typeof outputTabRef | typeof metadataTabRef | typeof toolsTabRef | typeof contextTabRef | null = null
      
      if (isInputNode) {
        activeRef = inputTabRef
      } else if (activeTab === "context") {
        activeRef = contextTabRef
      } else if (isAIAgent) {
        // LLM nodes have: Context, Input, Metadata, Tools, Completion
        if (activeTab === "input") {
          activeRef = inputTabRef
        } else if (activeTab === "metadata") {
          activeRef = metadataTabRef
        } else if (activeTab === "tools") {
          activeRef = toolsTabRef
        } else if (activeTab === "completion") {
          activeRef = completionTabRef
        }
      } else {
        // Other nodes have: Context, Input, Output
        if (activeTab === "input") {
          activeRef = inputTabRef
        } else if (activeTab === "output") {
          activeRef = outputTabRef
        }
      }

      if (activeRef?.current) {
        const tabContainer = activeRef.current.parentElement
        if (tabContainer) {
          const containerRect = tabContainer.getBoundingClientRect()
          const tabRect = activeRef.current.getBoundingClientRect()
          setIndicatorStyle({
            left: tabRect.left - containerRect.left,
            width: tabRect.width
          })
        }
      }
    }

    // Use requestAnimationFrame to ensure DOM is fully rendered
    const rafId = requestAnimationFrame(() => {
      // Multiple attempts to ensure refs are set and indicator is positioned
      setTimeout(updateIndicator, 10)
      setTimeout(updateIndicator, 50)
      setTimeout(updateIndicator, 100)
    })
    window.addEventListener('resize', updateIndicator)
    
    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', updateIndicator)
    }
  }, [activeTab, isInputNode, isAIAgent, node, mounted])

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose()
      }
    }

    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [onClose])

  // Context: upstream (input from) and downstream (output to) from edges
  const nodeContext = React.useMemo(() => {
    if (!node || !edges.length) return { inputFrom: [] as Node[], outputTo: [] as Node[] }
    const nodeMap = new Map(nodes.map((n) => [n.id, n]))
    const inputFrom = edges
      .filter((e) => e.target === node.id)
      .map((e) => nodeMap.get(e.source))
      .filter((n): n is Node => n != null)
    const outputTo = edges
      .filter((e) => e.source === node.id)
      .map((e) => nodeMap.get(e.target))
      .filter((n): n is Node => n != null)
    return { inputFrom, outputTo }
  }, [node, nodes, edges])

  const currentData = activeTab === "input" 
    ? input 
    : activeTab === "metadata" 
    ? metadata 
    : activeTab === "tools" 
    ? tools 
    : activeTab === "completion" 
    ? completion 
    : output
  // For completion, also check if it's a non-empty string
  const hasData = activeTab === "completion" 
    ? (completion !== null && completion !== undefined && completion !== "")
    : (currentData !== null && currentData !== undefined)

  // Format JSON with proper indentation
  const formatJSON = (obj: any): string => {
    try {
      return JSON.stringify(obj, null, 2)
    } catch {
      return String(obj)
    }
  }

  // Convert data to plain text format (for text view) - JSON format in paragraph/sentence layout
  const formatAsPlainText = (data: any): string => {
    if (data === null || data === undefined) {
      return ""
    }
    if (typeof data === "string") {
      return data
    }
    if (typeof data === "number" || typeof data === "boolean") {
      return String(data)
    }
    if (Array.isArray(data)) {
      const items = data.map(item => formatAsPlainText(item))
      return `[ ${items.join(", ")} ]`
    }
    if (typeof data === "object") {
      // Format object as JSON in paragraph format with keys and brackets
      const formatObject = (obj: any): string => {
        const entries: string[] = []
        for (const [key, value] of Object.entries(obj)) {
          if (value === null || value === undefined) {
            entries.push(`"${key}": null`)
          } else if (typeof value === "string") {
            entries.push(`"${key}": "${value}"`)
          } else if (typeof value === "number" || typeof value === "boolean") {
            entries.push(`"${key}": ${value}`)
          } else if (Array.isArray(value)) {
            const items = value.map(item => formatAsPlainText(item))
            entries.push(`"${key}": [ ${items.join(", ")} ]`)
          } else if (typeof value === "object") {
            entries.push(`"${key}": ${formatObject(value)}`)
          } else {
            entries.push(`"${key}": "${String(value)}"`)
          }
        }
        return `{ ${entries.join(", ")} }`
      }
      return formatObject(data)
    }
    return String(data)
  }

  // Format markdown text with links and citations
  const formatMarkdownText = (text: string): React.ReactNode => {
    if (!text || typeof text !== "string") return text
    
    const parts: React.ReactNode[] = []
    let lastIndex = 0
    
    // Match markdown links: [text](url)
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g
    const matches = Array.from(text.matchAll(linkRegex))
    
    // Match citations: [^number]
    const citationRegex = /\[\^([^\]]+)\]/g
    const citationMatches = Array.from(text.matchAll(citationRegex))
    
    // Combine all matches and sort by position
    const allMatches = [
      ...matches.map(m => ({ type: 'link', match: m, index: m.index! })),
      ...citationMatches.map(m => ({ type: 'citation', match: m, index: m.index! }))
    ].sort((a, b) => a.index - b.index)
    
    allMatches.forEach(({ type, match, index }) => {
      if (index > lastIndex) {
        parts.push(text.substring(lastIndex, index))
      }
      
      if (type === 'link') {
        const linkText = match[1]
        const linkUrl = match[2]
        parts.push(
          <a
            key={`link-${index}`}
            href={linkUrl}
            className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
            onClick={(e) => {
              e.stopPropagation()
              if (linkUrl.startsWith('mailto:')) {
                window.location.href = linkUrl
              } else {
                window.open(linkUrl, '_blank', 'noopener,noreferrer')
              }
            }}
          >
            {linkText}
          </a>
        )
        lastIndex = index + match[0].length
      } else if (type === 'citation') {
        const citationId = match[1]
        const citationNumber = citationId.match(/\d+/)?.[0] || citationId
        parts.push(
          <sup
            key={`citation-${index}`}
            className="text-blue-600 dark:text-blue-400 font-medium cursor-pointer hover:underline"
            title={`Citation ${citationId}`}
          >
            [{citationNumber}]
          </sup>
        )
        lastIndex = index + match[0].length
      }
    })
    
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex))
    }
    
    return <>{parts}</>
  }

  // Render formatted accordion-style view for tools (uses action_id as headers)
  const renderToolsFormatted = (data: any): React.ReactNode => {
    if (data === null || data === undefined) {
      return <div className="text-muted-foreground italic text-sm py-2">No data</div>
    }

    // Check if data is an array (tool_invocations)
    if (Array.isArray(data)) {
      if (data.length === 0) {
        return <div className="text-muted-foreground italic text-sm py-2">No tool invocations</div>
      }

      return (
        <div className="space-y-0 border border-gray-200 rounded-lg overflow-hidden">
          {data.map((toolInvocation, index) => {
            const actionId = toolInvocation?.action_id || `tool_${index}`
            const sectionPath = `tool_${actionId}_${index}`
            const isExpanded = expandedItems.has(sectionPath)
            const hasNestedData = typeof toolInvocation === "object" && toolInvocation !== null && Object.keys(toolInvocation).length > 0

            return (
              <div key={index} className="border-b border-gray-200 last:border-b-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setExpandedItems(prev => {
                      const newSet = new Set(prev)
                      if (newSet.has(sectionPath)) {
                        newSet.delete(sectionPath)
                      } else {
                        newSet.add(sectionPath)
                      }
                      return newSet
                    })
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors ${
                    isExpanded ? "bg-gray-50" : "bg-white hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Settings className="w-4 h-4 text-gray-600" />
                    <span className="text-sm font-medium text-foreground">{actionId}</span>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  )}
                </button>
                {isExpanded && (
                  <div className="bg-white px-4 py-3">
                    {hasNestedData ? (
                      renderFormattedTree(toolInvocation, 0, sectionPath)
                    ) : (
                      <div className="text-sm text-foreground">
                        {String(toolInvocation || "No content available")}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )
    }

    // Fallback to regular formatted accordion if not an array
    return renderFormattedAccordion(data)
  }

  // Render formatted accordion-style view
  const renderFormattedAccordion = (data: any): React.ReactNode => {
    if (data === null || data === undefined) {
      return <div className="text-muted-foreground italic text-sm py-2">No data</div>
    }

    if (typeof data !== "object") {
      return <div className="text-foreground text-sm py-2">{String(data)}</div>
    }

    // Get top-level keys for accordion sections
    const entries = Object.entries(data)
    
    // If no entries, create dummy sections for demonstration
    if (entries.length === 0) {
      const dummySections = [
        { key: "Tool Invocations", value: { query: "What is the capital of France?", search_results: "Inserted retrieved snippets", url_1: "linkedin.com", url_2: "theorg.com", user_question: "Etc" } },
        { key: "Citations", value: { citation_1: "Source document 1", citation_2: "Source document 2" } },
        { key: "Prompt", value: { system: "You are a helpful assistant", user: "Answer the following question" } },
        { key: "Provider", value: { name: "OpenAI", model: "GPT-4", version: "1.0" } },
        { key: "Params", value: { temperature: 0.7, max_tokens: 1000, top_p: 1.0 } }
      ]
      return (
        <div className="space-y-0 border border-gray-200 rounded-lg overflow-hidden">
          {dummySections.map(({ key, value }) => {
            const sectionPath = key
            const isExpanded = expandedItems.has(sectionPath)
            return (
              <div key={key} className="border-b border-gray-200 last:border-b-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setExpandedItems(prev => {
                      const newSet = new Set(prev)
                      if (newSet.has(sectionPath)) {
                        newSet.delete(sectionPath)
                      } else {
                        newSet.add(sectionPath)
                      }
                      return newSet
                    })
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors ${
                    isExpanded ? "bg-gray-50" : "bg-white hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {getSectionIcon(key)}
                    <span className="text-sm font-medium text-foreground">{key}</span>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  )}
                </button>
                {isExpanded && (
                  <div className="bg-white px-4 py-3">
                    {renderFormattedTree(value, 0, sectionPath)}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )
    }

    // Icon mapping for common section names
    const getSectionIcon = (key: string) => {
      const lowerKey = key.toLowerCase()
      if (lowerKey.includes("tool") || lowerKey.includes("invocation")) {
        return <Settings className="w-4 h-4 text-gray-600" />
      }
      if (lowerKey.includes("citation")) {
        return <FileText className="w-4 h-4 text-gray-400" />
      }
      if (lowerKey.includes("prompt")) {
        return <FileText className="w-4 h-4 text-gray-400" />
      }
      if (lowerKey.includes("provider")) {
        return <Building2 className="w-4 h-4 text-gray-400" />
      }
      if (lowerKey.includes("param")) {
        return <Code2 className="w-4 h-4 text-gray-400" />
      }
      return <FileText className="w-4 h-4 text-gray-400" />
    }

    // Helper to ensure sections have content - add dummy data if empty
    const ensureSectionContent = (key: string, value: any): any => {
      if (value === null || value === undefined || (typeof value === "object" && Object.keys(value).length === 0)) {
        const lowerKey = key.toLowerCase()
        if (lowerKey.includes("tool") || lowerKey.includes("invocation")) {
          return {
            query: "What is the capital of France?",
            search_results: "Inserted retrieved snippets",
            url_1: "linkedin.com",
            url_2: "theorg.com",
            user_question: "Etc"
          }
        }
        if (lowerKey.includes("citation")) {
          return {
            citation_1: "Source document 1",
            citation_2: "Source document 2",
            citation_3: "Source document 3"
          }
        }
        if (lowerKey.includes("prompt")) {
          return {
            system: "You are a helpful assistant",
            user: "Answer the following question",
            context: "Additional context information"
          }
        }
        if (lowerKey.includes("provider")) {
          return {
            name: "OpenAI",
            model: "GPT-4",
            version: "1.0"
          }
        }
        if (lowerKey.includes("param")) {
          return {
            temperature: 0.7,
            max_tokens: 1000,
            top_p: 1.0
          }
        }
        return { value: "Sample content", data: "Additional information" }
      }
      return value
    }

    return (
      <div className="space-y-0 border border-gray-200 rounded-lg overflow-hidden">
        {entries.map(([key, value], index) => {
          const sectionPath = key
          const isExpanded = expandedItems.has(sectionPath)
          const hasNestedData = typeof value === "object" && value !== null && (Array.isArray(value) ? value.length > 0 : Object.keys(value).length > 0)

          return (
            <div key={key} className="border-b border-gray-200 last:border-b-0">
              {/* Accordion Header */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setExpandedItems(prev => {
                    const newSet = new Set(prev)
                    if (newSet.has(sectionPath)) {
                      newSet.delete(sectionPath)
                    } else {
                      newSet.add(sectionPath)
                    }
                    return newSet
                  })
                }}
                className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors ${
                  isExpanded ? "bg-gray-50" : "bg-white hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-3">
                  {getSectionIcon(key)}
                  <span className="text-sm font-medium text-foreground">{key}</span>
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                )}
              </button>

              {/* Accordion Content - Tree Structure */}
              {isExpanded && (
                <div className="bg-white px-4 py-3">
                  {hasNestedData ? (
                    renderFormattedTree(ensureSectionContent(key, value), 0, sectionPath)
                  ) : (
                    <div className="text-sm text-foreground">
                      {ensureSectionContent(key, value) && typeof ensureSectionContent(key, value) === "object" 
                        ? renderFormattedTree(ensureSectionContent(key, value), 0, sectionPath)
                        : String(ensureSectionContent(key, value) || "No content available")
                      }
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  // Render tree structure for expanded accordion sections
  const renderFormattedTree = (data: any, level: number = 0, parentPath: string = ""): React.ReactNode => {
    if (data === null || data === undefined) {
      return <span className="text-muted-foreground italic text-sm">null</span>
    }

    if (typeof data === "string" || typeof data === "number" || typeof data === "boolean") {
      return <span className="text-sm text-foreground">{String(data)}</span>
    }

    if (Array.isArray(data)) {
      if (data.length === 0) {
        return <span className="text-muted-foreground italic text-sm">Empty array</span>
      }
      return (
        <div className="space-y-2">
          {data.map((item, index) => {
            const itemPath = `${parentPath}[${index}]`
            const isExpanded = expandedItems.has(itemPath)
            const hasNestedData = typeof item === "object" && item !== null && (Array.isArray(item) ? item.length > 0 : Object.keys(item).length > 0)

            return (
              <div key={index} className="pl-4">
                {hasNestedData ? (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setExpandedItems(prev => {
                          const newSet = new Set(prev)
                          if (newSet.has(itemPath)) {
                            newSet.delete(itemPath)
                          } else {
                            newSet.add(itemPath)
                          }
                          return newSet
                        })
                      }}
                      className="flex items-center gap-2 hover:text-foreground transition-colors text-left w-full mb-1"
                    >
                      <span className="px-2 py-0.5 text-xs font-medium text-gray-600 bg-gray-100 border border-gray-200 rounded-md">
                        {Array.isArray(item) ? `Item ${index + 1}` : `URL ${index + 1}`}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-3 h-3 text-gray-400 flex-shrink-0" />
                      ) : (
                        <ChevronDown className="w-3 h-3 text-gray-400 flex-shrink-0" />
                      )}
                    </button>
                    {isExpanded && (
                      <div className="pl-4 mt-1">
                        {renderFormattedTree(item, level + 1, itemPath)}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 text-xs font-medium text-gray-600 bg-gray-100 border border-gray-200 rounded-md">
                      {Array.isArray(item) ? `Item ${index + 1}` : `URL ${index + 1}`}
                    </span>
                    <span className="text-sm text-foreground">{renderFormattedTree(item, level + 1, itemPath)}</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )
    }

    if (typeof data === "object") {
      const entries = Object.entries(data)
      if (entries.length === 0) {
        return <span className="text-muted-foreground italic text-sm">Empty object</span>
      }

      return (
        <div className="space-y-2">
          {entries.map(([key, value]) => {
            const itemPath = parentPath ? `${parentPath}.${key}` : key
            const isExpanded = expandedItems.has(itemPath)
            const hasNestedData = typeof value === "object" && value !== null && (Array.isArray(value) ? value.length > 0 : Object.keys(value).length > 0)
            const isPrimitive = typeof value !== "object" || value === null

            // Check if value is a URL (starts with http)
            const isUrl = typeof value === "string" && (value.startsWith("http://") || value.startsWith("https://"))

            return (
              <div key={key} className={level > 0 ? "pl-4" : ""}>
                {hasNestedData ? (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setExpandedItems(prev => {
                          const newSet = new Set(prev)
                          if (newSet.has(itemPath)) {
                            newSet.delete(itemPath)
                          } else {
                            newSet.add(itemPath)
                          }
                          return newSet
                        })
                      }}
                      className="flex items-center gap-2 hover:text-foreground transition-colors text-left w-full mb-1"
                    >
                      <span className="px-2 py-0.5 text-xs font-medium text-gray-600 bg-gray-100 border border-gray-200 rounded-md">
                        {key}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-3 h-3 text-gray-400 flex-shrink-0" />
                      ) : (
                        <ChevronDown className="w-3 h-3 text-gray-400 flex-shrink-0" />
                      )}
                    </button>
                    {isExpanded && (
                      <div className="pl-4 mt-1">
                        {renderFormattedTree(value, level + 1, itemPath)}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 text-xs font-medium text-gray-600 bg-gray-100 border border-gray-200 rounded-md">
                      {key}
                    </span>
                    {isUrl ? (
                      <a
                        href={value as string}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline"
                      >
                        {value as string}
                      </a>
                    ) : (
                      <span className="text-sm text-foreground">{String(value)}</span>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )
    }

    return <span className="text-muted-foreground text-sm">{String(data)}</span>
  }

  // Render hierarchical data structure (for non-formatted views)
  const renderHierarchicalData = (data: any, path: string = "", level: number = 0): React.ReactNode => {
    if (data === null || data === undefined) {
      return <span className="text-muted-foreground italic">null</span>
    }

    if (typeof data === "string" || typeof data === "number" || typeof data === "boolean") {
      return <span className="text-foreground/90">{String(data)}</span>
    }

    if (Array.isArray(data)) {
      if (data.length === 0) {
        return <span className="text-muted-foreground italic text-sm">Empty array</span>
      }
      return (
        <div className="space-y-2">
          {data.map((item, index) => {
            const itemPath = `${path}[${index}]`
            const isExpanded = expandedItems.has(itemPath)
            const hasNestedData = typeof item === "object" && item !== null && (Array.isArray(item) ? item.length > 0 : Object.keys(item).length > 0)
            
            return (
              <div key={index} className="pl-6">
                {hasNestedData ? (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setExpandedItems(prev => {
                          const newSet = new Set(prev)
                          if (newSet.has(itemPath)) {
                            newSet.delete(itemPath)
                          } else {
                            newSet.add(itemPath)
                          }
                          return newSet
                        })
                      }}
                      className="flex items-center gap-2 hover:text-foreground transition-colors text-left w-full"
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      )}
                      <span className="text-sm font-medium text-foreground">Item {index + 1}</span>
                    </button>
                    {isExpanded && (
                      <div className="pl-6 mt-1.5">
                        {renderHierarchicalData(item, itemPath, level + 1)}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-sm text-foreground/90 pl-6">
                    {renderHierarchicalData(item, itemPath, level + 1)}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )
    }

    if (typeof data === "object") {
      const entries = Object.entries(data)
      if (entries.length === 0) {
        return <span className="text-muted-foreground italic text-sm">Empty object</span>
      }

      return (
        <div className="space-y-2.5">
          {entries.map(([key, value]) => {
            const itemPath = path ? `${path}.${key}` : key
            const isExpanded = expandedItems.has(itemPath)
            const hasNestedData = typeof value === "object" && value !== null && (Array.isArray(value) ? value.length > 0 : Object.keys(value).length > 0)
            const isTopLevelTool = level === 0 && typeof value === "object" && value !== null

            return (
              <div key={key} className={level === 0 ? "" : "pl-6"}>
                {hasNestedData ? (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setExpandedItems(prev => {
                          const newSet = new Set(prev)
                          if (newSet.has(itemPath)) {
                            newSet.delete(itemPath)
                          } else {
                            newSet.add(itemPath)
                          }
                          return newSet
                        })
                      }}
                      className={`flex items-center gap-2 hover:text-foreground transition-colors text-left w-full ${isTopLevelTool ? "mb-2" : ""}`}
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      )}
                      <span className={`text-sm ${isTopLevelTool ? "font-semibold" : "font-medium"} text-foreground`}>{key}</span>
                    </button>
                    {isExpanded && (
                      <div className="pl-6 mt-1.5">
                        {renderHierarchicalData(value, itemPath, level + 1)}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex items-start gap-2">
                    <span className="text-sm font-medium text-foreground flex-shrink-0">{key}:</span>
                    <span className="text-sm text-foreground/90 break-words">{renderHierarchicalData(value, itemPath, level + 1)}</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )
    }

    return <span className="text-muted-foreground text-sm">{String(data)}</span>
  }

  // Helper function to download file
  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  // Convert output to CSV format
  const convertToCSV = (data: any): string => {
    if (typeof data !== 'object' || data === null) {
      return String(data)
    }
    
    if (Array.isArray(data)) {
      if (data.length === 0) return ''
      const headers = Object.keys(data[0] || {})
      const rows = data.map(item => 
        headers.map(header => {
          const value = item[header]
          if (typeof value === 'object' && value !== null) {
            return JSON.stringify(value)
          }
          return String(value ?? '')
        })
      )
      return [headers.join(','), ...rows.map(row => row.join(','))].join('\n')
    }
    
    const entries = Object.entries(data)
    return ['Key,Value', ...entries.map(([key, value]) => {
      const val = typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value ?? '')
      return `${key},${val}`
    })].join('\n')
  }

  if (!node || !mounted) return null

  // Get identifier and duration from node data (passed from run progress)
  const identifier = (nodeData as any)?._identifier || node.id
  const duration = (nodeData as any)?._duration
  
  // Extract node number for display (e.g., "1" from "node-1" or "llm-1")
  const nodeNumber = identifier.split("-").pop() || "1"

  // Modal content to be rendered via portal
  const modalContent = (
    <>
      {/* Backdrop - closes when clicking on backdrop or outside modal/run progress */}
      <div 
        data-node-detail-modal="backdrop"
        className="fixed inset-0 bg-black/20 z-[100]" 
        onClick={(e) => {
          const target = e.target as HTMLElement
          // Don't close if clicking inside modal content or run progress panel
          const isInsideModal = target.closest('[data-node-detail-modal="content"]')
          const isInsideRunProgress = target.closest('[data-run-progress-panel]')
          
          // Only close if clicking directly on backdrop (not inside any panels)
          if (target === e.currentTarget && !isInsideModal && !isInsideRunProgress) {
            onClose()
          }
        }}
        onMouseDown={(e) => {
          // Prevent any mousedown events from bubbling
          if (e.target === e.currentTarget) {
            e.stopPropagation()
          }
        }}
      />
      
      {/* Modal - allow closing when clicking on container itself, but not children */}
      <div
        data-node-detail-modal="content"
        ref={modalRef}
        className="fixed right-0 top-0 bottom-0 z-[101] flex flex-row items-end"
        style={{
          marginTop: "24px",
          marginBottom: "24px",
          marginRight: "24px",
          height: "calc(100vh - 48px)",
          width: showRunProgress ? "calc(100% - 48px)" : "60%",
        }}
        onClick={(e) => {
          const target = e.target as HTMLElement
          // Don't close if clicking inside run progress panel
          const isInsideRunProgress = target.closest('[data-run-progress-panel]')
          
          // Close if clicking directly on the container itself (not children)
          // but not if clicking inside run progress panel
          if (e.target === e.currentTarget && !isInsideRunProgress) {
            onClose()
          }
          // Stop propagation to prevent backdrop from closing when clicking children
          e.stopPropagation()
        }}
        onMouseDown={(e) => {
          // Stop propagation for children, but allow container clicks
          if (e.target !== e.currentTarget) {
            e.stopPropagation()
          }
        }}
      >
        {/* Main Modal Content */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white shadow-2xl rounded-lg h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
          <div className="flex items-center gap-3">
            {/* Icon */}
            {appName === "AI Agent" && actionName === "LLM" ? (
              <div className="w-8 h-8 flex items-center justify-center flex-shrink-0 border border-border rounded">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-foreground">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </div>
            ) : (
              <div className={`w-8 h-8 rounded-lg border border-border flex items-center justify-center ${
                type === "input" ? "bg-white" : "bg-muted"
              }`}>
                <AppIcon appName={appName} className="w-4 h-4" />
              </div>
            )}
            <h2 className="text-xl font-semibold">{actionName} {nodeNumber}</h2>
            <span className="px-2 py-0.5 text-xs font-normal text-gray-400 border border-gray-300 rounded-md">
              {identifier}
            </span>
            {duration && (
              <span className="text-sm text-gray-500">{duration}s</span>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden p-1"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="relative flex items-center gap-6 px-6 border-b flex-shrink-0 mt-4">
          {isInputNode ? (
            <button
              ref={inputTabRef}
              onClick={() => setActiveTab("input")}
              className={`relative text-sm font-normal transition-colors cursor-pointer leading-none pb-3 ${
                activeTab === "input"
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Input
            </button>
          ) : isAIAgent ? (
            <>
              {/* LLM nodes: Context, Input, Metadata, Tools, Completion */}
              <button
                ref={contextTabRef}
                onClick={() => setActiveTab("context")}
                className={`relative text-sm font-normal transition-colors cursor-pointer leading-none pb-3 ${
                  activeTab === "context"
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Context
              </button>
              <button
                ref={inputTabRef}
                onClick={() => setActiveTab("input")}
                className={`relative text-sm font-normal transition-colors cursor-pointer leading-none pb-3 ${
                  activeTab === "input"
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Input
              </button>
              <button
                ref={metadataTabRef}
                onClick={() => setActiveTab("metadata")}
                className={`relative text-sm font-normal transition-colors cursor-pointer leading-none pb-3 ${
                  activeTab === "metadata"
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Metadata
              </button>
              <button
                ref={toolsTabRef}
                onClick={() => setActiveTab("tools")}
                className={`relative text-sm font-normal transition-colors cursor-pointer leading-none pb-3 ${
                  activeTab === "tools"
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Tools
              </button>
              <button
                ref={completionTabRef}
                onClick={() => setActiveTab("completion")}
                className={`relative text-sm font-normal transition-colors cursor-pointer leading-none pb-3 ${
                  activeTab === "completion"
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Completion
              </button>
            </>
          ) : (
            <>
              {/* Other nodes: Context, Input, Output */}
              <button
                ref={contextTabRef}
                onClick={() => setActiveTab("context")}
                className={`relative text-sm font-normal transition-colors cursor-pointer leading-none pb-3 ${
                  activeTab === "context"
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Context
              </button>
              <button
                ref={inputTabRef}
                onClick={() => setActiveTab("input")}
                className={`relative text-sm font-normal transition-colors cursor-pointer leading-none pb-3 ${
                  activeTab === "input"
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Input
              </button>
              <button
                ref={outputTabRef}
                onClick={() => setActiveTab("output")}
                className={`relative text-sm font-normal transition-colors cursor-pointer leading-none pb-3 ${
                  activeTab === "output"
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Output
              </button>
            </>
          )}
          {/* Sliding indicator */}
          <div
            className="absolute bottom-0 h-0.5 bg-gray-400 transition-all duration-300 ease-in-out"
            style={{
              left: `${indicatorStyle.left}px`,
              width: `${indicatorStyle.width}px`,
            }}
          />
        </div>

        {/* Search Bar, View Mode and Actions Row (hidden for Context tab) */}
        {activeTab !== "context" && (
        <div className="flex items-center justify-between gap-4 px-6 pb-2 bg-background flex-shrink-0 pt-6">
          {/* View Mode Tabs and Action Icons on the left */}
          <div className="flex items-center gap-2">
            {!isInputNode && (
              <ToggleGroup
                type="single"
                value={viewMode}
                onValueChange={(value) => {
                  if (value) setViewMode(value as "text" | "formatted" | "code")
                }}
                className="bg-[#f5f5f5] rounded p-1 border-0 h-8"
              >
                <ToggleGroupItem 
                  value="text" 
                  aria-label="Text" 
                  className="px-6 h-7 text-sm rounded-sm border-0 text-muted-foreground data-[state=on]:bg-white data-[state=on]:text-foreground data-[state=on]:shadow-sm transition-all"
                >
                  Text
                </ToggleGroupItem>
                <ToggleGroupItem 
                  value="formatted" 
                  aria-label="Formatted" 
                  className="px-6 h-7 text-sm rounded-sm border-0 text-muted-foreground data-[state=on]:bg-white data-[state=on]:text-foreground data-[state=on]:shadow-sm transition-all"
                >
                  Formatted
                </ToggleGroupItem>
                <ToggleGroupItem 
                  value="code" 
                  aria-label="Code" 
                  className="px-6 h-7 text-sm rounded-sm border-0 text-muted-foreground data-[state=on]:bg-white data-[state=on]:text-foreground data-[state=on]:shadow-sm transition-all"
                >
                  Code
                </ToggleGroupItem>
              </ToggleGroup>
            )}

            <div className="flex items-center gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 hover:bg-muted text-muted-foreground"
                onClick={() => {
                  if (hasData) {
                    navigator.clipboard.writeText(formatJSON(currentData))
                  }
                }}
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 hover:bg-muted text-muted-foreground"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => {
                      if (hasData) {
                        downloadFile(formatJSON(currentData), `${activeTab}-${node.id}.json`, 'application/json')
                      }
                    }}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download as JSON
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      if (hasData) {
                        downloadFile(convertToCSV(currentData), `${activeTab}-${node.id}.csv`, 'text/csv')
                      }
                    }}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download as CSV
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Search Bar on the right */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-background px-6 py-4">
          <div className="relative">
            {activeTab === "context" ? (
              <div className="flex flex-col gap-4">
                <Card className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
                  <CardHeader className="py-3 px-4 border-b border-border/50">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <ArrowLeft className="h-4 w-4 text-muted-foreground" />
                      Input derived from
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 flex flex-col gap-2">
                    {nodeContext.inputFrom.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-2">No upstream nodes. Connect inputs in the workflow to see sources here.</p>
                    ) : (
                      nodeContext.inputFrom.map((n) => {
                        const d = n.data as any
                        const label = d?.actionName || d?.appName || n.id
                        return (
                          <Card key={n.id} className="rounded-md border border-border/60 bg-muted/30 p-2.5 hover:bg-muted/50 transition-colors">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-medium truncate">{label}</span>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5">Output feeds into this node</p>
                          </Card>
                        )
                      })
                    )}
                  </CardContent>
                </Card>
                <Card className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
                  <CardHeader className="py-3 px-4 border-b border-border/50">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      Output goes to
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 flex flex-col gap-2">
                    {nodeContext.outputTo.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-2">No downstream nodes. Connect outputs in the workflow to see destinations here.</p>
                    ) : (
                      nodeContext.outputTo.map((n) => {
                        const d = n.data as any
                        const label = d?.actionName || d?.appName || n.id
                        return (
                          <Card key={n.id} className="rounded-md border border-border/60 bg-muted/30 p-2.5 hover:bg-muted/50 transition-colors">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-medium truncate">{label}</span>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5">Receives this node&apos;s output</p>
                          </Card>
                        )
                      })
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : isInputNode ? (
              // For input nodes, always show as JSON with specific format
              <div className="bg-gradient-to-br from-muted/60 to-muted/40 rounded-lg p-4 border border-border/50 overflow-x-hidden shadow-inner font-mono text-xs">
                <pre className="whitespace-pre-wrap break-words leading-relaxed text-[11px]">
                  <code className="text-foreground/90">
{`{
  "text": "real madrid"
}`}
                  </code>
                </pre>
              </div>
            ) : isAIAgent && activeTab === "input" ? (
              // Special handling for LLM node input tab
              <div 
                className={`${
                  viewMode === "formatted" 
                    ? "" 
                    : "bg-gradient-to-br from-muted/60 to-muted/40 rounded-lg p-4 border border-border/50 overflow-x-hidden shadow-inner font-mono text-xs"
                }`}
              >
                {viewMode === "text" ? (
                  // Text view: { "in-0": "real madrid"}
                  <p className="text-sm text-foreground break-words">
                    {`{ "in-0": "real madrid"}`}
                  </p>
                ) : viewMode === "formatted" ? (
                  // Formatted view: in-0 as collapsible header, real madrid as content
                  <div className="space-y-0 border border-gray-200 rounded-lg overflow-hidden">
                    <div className="border-b border-gray-200 last:border-b-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setExpandedItems(prev => {
                            const newSet = new Set(prev)
                            const itemPath = "llm-input-in-0"
                            if (newSet.has(itemPath)) {
                              newSet.delete(itemPath)
                            } else {
                              newSet.add(itemPath)
                            }
                            return newSet
                          })
                        }}
                        className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors ${
                          expandedItems.has("llm-input-in-0") ? "bg-gray-50" : "bg-white hover:bg-gray-50"
                        }`}
                      >
                        <span className="text-sm font-medium text-foreground">in-0</span>
                        {expandedItems.has("llm-input-in-0") ? (
                          <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        )}
                      </button>
                      {expandedItems.has("llm-input-in-0") && (
                        <div className="bg-white px-4 py-3">
                          <span className="text-sm text-foreground">real madrid</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  // Code view: { "in-0": "real madrid" } with proper formatting
                  <pre className="whitespace-pre-wrap break-words leading-relaxed text-[11px]">
                    <code className="text-foreground/90">
{`{
  "in-0": "real madrid"
}`}
                    </code>
                  </pre>
                )}
              </div>
            ) : isAIAgent && activeTab === "metadata" ? (
              // Special handling for LLM node metadata tab - show as text, formatted, or code based on viewMode
              <div 
                className={`${
                  viewMode === "formatted" 
                    ? "" 
                    : "bg-gradient-to-br from-muted/60 to-muted/40 rounded-lg p-4 border border-border/50 overflow-x-hidden shadow-inner font-mono text-xs"
                }`}
              >
                {viewMode === "text" ? (
                  // Text view: Show as single line JSON string
                  <p className="text-sm text-foreground break-words">
                    {formatAsPlainText(currentData)}
                  </p>
                ) : viewMode === "formatted" ? (
                  // Formatted view: Show as accordion-style formatted view
                  <div className="text-sm text-foreground/90">
                    {renderFormattedAccordion(currentData)}
                  </div>
                ) : (
                  // Code view: Show as formatted JSON
                  <pre className="whitespace-pre-wrap break-words leading-relaxed text-[11px]">
                    <code className="text-foreground/90">
                      {formatJSON(currentData)}
                    </code>
                  </pre>
                )}
              </div>
            ) : isAIAgent && activeTab === "tools" ? (
              // Special handling for LLM node tools tab - support text, formatted, and code views
              <div 
                className={`${
                  viewMode === "formatted" 
                    ? "" 
                    : "bg-gradient-to-br from-muted/60 to-muted/40 rounded-lg p-4 border border-border/50 overflow-x-hidden shadow-inner font-mono text-xs"
                }`}
              >
                {viewMode === "text" ? (
                  // Text view: Show as plain text
                  <p className="text-sm text-foreground break-words">
                    {formatAsPlainText(currentData)}
                  </p>
                ) : viewMode === "formatted" ? (
                  // Formatted view: Show as accordion-style formatted view with action_id as headers
                  <div className="text-sm text-foreground/90">
                    {renderToolsFormatted(currentData)}
                  </div>
                ) : (
                  // Code view: Show as formatted JSON
                  <pre className="whitespace-pre-wrap break-words leading-relaxed text-[11px]">
                    <code className="text-foreground/90">
                      {formatJSON(currentData)}
                    </code>
                  </pre>
                )}
              </div>
            ) : (
              <div 
                className={`${
                  activeTab === "completion" && (viewMode === "formatted" || (viewMode === "text" && typeof currentData === "string"))
                    ? "" 
                    : viewMode === "formatted" 
                    ? "" 
                    : activeTab === "completion" && viewMode === "text" && typeof currentData === "string" 
                      ? "bg-gradient-to-br from-muted/60 to-muted/40 rounded-lg p-4 border border-border/50 overflow-x-hidden shadow-inner font-sans" 
                      : "bg-gradient-to-br from-muted/60 to-muted/40 rounded-lg p-4 border border-border/50 overflow-x-hidden shadow-inner font-mono text-xs"
                }`}
              >
                {hasData ? (
                  activeTab === "output" && typeof currentData === "string" && currentData.startsWith("Error:") ? (
                    <Alert variant="destructive" className="rounded-lg border-destructive/50 bg-destructive/5 [&>svg]:text-destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle className="font-semibold text-destructive">This node failed</AlertTitle>
                      <AlertDescription className="flex flex-col gap-3 text-destructive/90">
                        <p className="text-sm whitespace-pre-wrap">
                          {(node?.data as any)?.actionName ?? (node?.data as any)?.appName ?? "This node"} did not complete successfully. Check the output for details or get help resolving the issue.
                        </p>
                        <Button size="sm" variant="outline" className="w-fit gap-2 border-destructive/40 bg-destructive/5 text-destructive hover:bg-destructive/10 hover:border-destructive/60">
                          <Bot className="h-3.5 w-3.5" />
                          Ask AI
                        </Button>
                      </AlertDescription>
                    </Alert>
                  ) : activeTab === "completion" ? (
                    // Completion tab: JSON with collapsible keys
                    <div className="bg-gradient-to-br from-muted/60 to-muted/40 rounded-lg p-4 border border-border/50 overflow-x-hidden overflow-y-auto shadow-inner font-mono text-xs min-h-0">
                      <CollapsibleJsonView
                        text={typeof currentData === "string" ? JSON.stringify({ completion: currentData }) : JSON.stringify(currentData)}
                        className="text-foreground/90 leading-relaxed text-[11px]"
                        defaultExpandedDepth={2}
                      />
                    </div>
                  ) : viewMode === "text" ? (
                    // Text view - plain text, no JSON structure, single paragraph
                    <p className="text-sm text-foreground break-words">
                      {formatAsPlainText(currentData)}
                    </p>
                  ) : viewMode === "formatted" ? (
                    <div className="text-sm text-foreground/90">
                      {renderFormattedAccordion(currentData)}
                    </div>
                  ) : (
                    <div className="bg-gradient-to-br from-muted/60 to-muted/40 rounded-lg p-4 border border-border/50 overflow-x-hidden overflow-y-auto shadow-inner font-mono text-xs">
                      <CollapsibleJsonView
                        text={typeof currentData === "object" && currentData !== null ? JSON.stringify(currentData) : JSON.stringify({ value: currentData })}
                        className="text-foreground/90 leading-relaxed text-[11px]"
                        defaultExpandedDepth={2}
                      />
                    </div>
                  )
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="text-sm">No {activeTab === "metadata" ? "metadata" : activeTab === "tools" ? "tools" : activeTab} yet</p>
                    <p className="text-xs mt-1">Run the flow to see the {activeTab === "metadata" ? "metadata" : activeTab === "tools" ? "tools" : activeTab}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        </div>
        
        {/* Transparent gap between panels - clickable to close modal */}
        {showRunProgress && runProgressComponent && (
          <div 
            className="w-4 flex-shrink-0 cursor-pointer" 
            onClick={onClose}
            onMouseDown={(e) => e.stopPropagation()}
          />
        )}
        
        {/* Run Progress Panel - shown when opened from run progress, on the right */}
        {showRunProgress && runProgressComponent && (
          <div 
            data-run-progress-panel="in-modal-wrapper"
            className="flex-shrink-0 bg-white shadow-2xl rounded-lg h-fit"
            onClick={(e) => {
              // Stop propagation to prevent modal from closing when clicking inside
              e.stopPropagation()
            }}
            onMouseDown={(e) => {
              // Stop propagation on mousedown as well
              e.stopPropagation()
            }}
          >
            {runProgressComponent}
          </div>
        )}
      </div>
    </>
  )

  // Render modal using portal at document root level for complete independence
  return createPortal(modalContent, document.body)
}

