"use client"

import React, { useState, useEffect, useMemo } from "react"
import { createPortal } from "react-dom"
import { 
  RefreshCw, 
  Calendar as CalendarIcon, 
  Download, 
  Filter, 
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
  ArrowUpDown,
  Info,
  Workflow,
  X,
  Hash,
  MessageCircle,
  Clock,
  Bot,
  User,
  Link2,
  ArrowDownToLine,
  ArrowUpFromLine,
  AlertCircle,
  Maximize2,
  Locate,
  ArrowRight,
  ArrowLeft,
  Copy
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { WorkflowGantt, type GanttNode, GANTT_NODES, getNodeIdentifier, GanttNodeIcon, varyGanttNodesByRunId } from "@/components/workflow-gantt"
import { TabContext } from "@/components/dashboard-layout"
interface RunData {
  runId: string
  conversationId: string
  created: string
  status: "success" | "error" | "running"
  input: string
  output: string
  latency: string
  tokens: number
  user: string
}

const mockRuns: RunData[] = [
  {
    runId: "8af162da-6ee4-4bcf-aa7a-99b1f4adf151",
    conversationId: "N/A",
    created: "12/04/25 11:25 AM",
    status: "success",
    input: "What are you capable of?",
    output: "Hello! How can I assist you today?",
    latency: "1.45s",
    tokens: 71,
    user: "dhidalgo@stack-ai.com"
  },
  {
    runId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    conversationId: "conv-xyz-001",
    created: "12/05/25 09:15 AM",
    status: "success",
    input: "Summarize this document",
    output: "Summary: The document covers key metrics and next steps.",
    latency: "2.12s",
    tokens: 142,
    user: "user@example.com"
  },
  {
    runId: "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    conversationId: "N/A",
    created: "12/06/25 02:30 PM",
    status: "error",
    input: "Generate a report",
    output: "Error: Rate limit exceeded.",
    latency: "0.89s",
    tokens: 12,
    user: "dhidalgo@stack-ai.com"
  },
  {
    runId: "c3d4e5f6-a7b8-9012-cdef-123456789012",
    conversationId: "conv-abc-002",
    created: "12/07/25 11:00 AM",
    status: "success",
    input: "Translate to Spanish",
    output: "Hola! ¿En qué puedo ayudarte hoy?",
    latency: "1.22s",
    tokens: 58,
    user: "other@stack-ai.com"
  },
  {
    runId: "d4e5f6a7-b8c9-0123-def0-234567890123",
    conversationId: "conv-def-003",
    created: "12/08/25 04:45 PM",
    status: "running",
    input: "Analyze sentiment",
    output: "",
    latency: "-",
    tokens: 0,
    user: "dhidalgo@stack-ai.com"
  }
]

// Predecessors/successors for Context tab (multiple inputs and outputs per node)
function getNodeContext(node: GanttNode | null, nodes: GanttNode[] = GANTT_NODES): { inputFrom: GanttNode[]; outputTo: GanttNode[] } {
  if (!node) return { inputFrom: [], outputTo: [] }
  const candidatesIn = nodes
    .filter((n) => n.id !== node.id && n.endSec <= node.startSec)
    .sort((a, b) => b.endSec - a.endSec)
    .slice(0, 3)
  const candidatesOut = nodes
    .filter((n) => n.id !== node.id && n.startSec >= node.endSec)
    .sort((a, b) => a.startSec - b.startSec)
    .slice(0, 3)
  return { inputFrom: candidatesIn, outputTo: candidatesOut }
}

// Per-node input/output for Run Details sidebar (different text per node)
function getNodeInputOutput(node: { id: string; label: string } | null): { input: string; output: string } {
  if (!node) return { input: "—", output: "—" }
  const byId: Record<string, { input: string; output: string }> = {
    "1": { input: "Trigger: New message received from user.", output: "Message payload forwarded to the workflow." },
    "2": { input: "User asked: What are you capable of?", output: "I can answer questions, search the web, and help with tasks. Here’s a short overview of my capabilities." },
    "2a": { input: "Context from previous step + query: Summarize the key points.", output: "Summary: The conversation covered capabilities, examples, and next steps the user can take." },
    "3": { input: "User intent and message content for routing.", output: "Route: Search path (confidence 0.92)." },
    "4": { input: "Query: Latest Real Madrid score. Source: LiveScore.", output: "Real Madrid 1 - 2 Manchester City (Full Time). Match details and link returned." },
    "5": { input: "To: user@example.com\nSubject: Your requested summary\nBody: [Generated summary].", output: "Email sent successfully. Message ID: msg_abc123." },
    "6": { input: "Condition: search_results.count > 0. Branch: true.", output: "Taking the true branch; continuing to Notion step." },
    "7": { input: "Title: Meeting notes\nContent: [Formatted summary from AI].", output: "Page created in Notion. URL: https://notion.so/..." },
    "8": { input: "Final assembled response and metadata.", output: "Response delivered to user. Run completed." },
    "9": { input: "Subflow trigger with project context.", output: "Subflow finished. 3 nodes executed." },
  }
  return byId[node.id] ?? { input: `Input for ${node.label}.`, output: `Output for ${node.label}.` }
}

// AI Agent–specific tab content (input, tools, completion) per instance
function getAiAgentTabContent(nodeId: string): { input: string; tools: string; completion: string } {
  const byId: Record<string, { input: string; tools: string; completion: string }> = {
    "2": {
      input: "User message: \"What are you capable of?\"\nContext: First message in conversation.",
      tools: "Tools used: None (direct reply).",
      completion: "Here’s what I can do for you:\n\n**Answer questions** — Current events, how-to’s, definitions, or just bouncing ideas.\n**Search the web** — I can look up scores, news, docs, or any fact you need.\n**Summarize** — Long articles, threads, or your own notes into short bullet points or a paragraph.\n**Help with tasks** — Drafting emails, outlining a plan, or walking through a process step by step.\n\nNo tools were used for this reply; it’s a direct answer. Want to try something specific?",
    },
    "2a": {
      input: "Previous completion + user: \"Summarize that in three bullet points.\"",
      tools: "Tools used: None.",
      completion: "• **Real Madrid 1 - 2 Manchester City** (Champions League).\n• Manchester City led and held on for an away win.\n• I can pull lineups, stats, or another match whenever you’d like.",
    },
    "4": {
      input: "Query: \"What was the latest Real Madrid score?\"\nTool choice: Search (LiveScore).",
      tools: "Tools used: Search – LiveScore API. Query: \"Real Madrid latest score\". Result: 1 - 2 vs Manchester City.",
      completion: "The latest result I found is **Real Madrid 1 - 2 Manchester City** (full time, Champions League). City went ahead and held on despite a second-half reply from Madrid. If you want lineups, xG, or another fixture I can look that up too.",
    },
    "9-2": {
      input: "Project subflow trigger with context.",
      tools: "Tools used: None.",
      completion: "Summary from this step: key points extracted and formatted for the next action. Ready for the Send Email step with the condensed version.",
    },
  }
  return byId[nodeId] ?? {
    input: "Input for AI Agent.",
    tools: "Tools invoked by AI Agent.",
    completion: "Response generated. You can ask a follow-up or switch to another task.",
  }
}

interface AnalyticsProps {
  onSwitchToWorkflow?: () => void
}

export function Analytics({ onSwitchToWorkflow }: AnalyticsProps) {
  const tabContext = React.useContext(TabContext)
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(2025, 11, 4), // Dec 4, 2025
    to: new Date(2025, 11, 10)   // Dec 10, 2025
  })
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null)
  const [selectedGanttNode, setSelectedGanttNode] = useState<GanttNode | null>(null)
  const [hoveredContextNodeId, setHoveredContextNodeId] = useState<string | null>(null)
  const [sidebarShowGeneral, setSidebarShowGeneral] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [completionModalOpen, setCompletionModalOpen] = useState(false)

  // When opened from Run Progress "Expand", land on run detail view
  useEffect(() => {
    if (tabContext?.openAnalyticsRunDetail && mockRuns.length > 0) {
      setSelectedRunId(mockRuns[0].runId)
      tabContext.setOpenAnalyticsRunDetail(false)
    }
  }, [tabContext?.openAnalyticsRunDetail])

  // When landing on run detail, show General in sidebar and no node selected
  useEffect(() => {
    if (selectedRunId) {
      setSelectedGanttNode(null)
      setSidebarShowGeneral(true)
      setSidebarOpen(true)
    }
  }, [selectedRunId])

  // When switching selected node, show node-specific view and open sidebar if closed
  useEffect(() => {
    if (selectedGanttNode?.id) {
      setSidebarShowGeneral(false)
      setSidebarOpen(true)
    }
  }, [selectedGanttNode?.id])

  // Close completion modal on Escape
  useEffect(() => {
    if (!completionModalOpen) return
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCompletionModalOpen(false)
    }
    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [completionModalOpen])

  const metrics = [
    {
      title: "Runs",
      value: "1",
      secondaryValue: "1",
      data: [{ date: "Dec 4", value: 1 }]
    },
    {
      title: "Users",
      value: "1",
      secondaryValue: "1",
      data: [{ date: "Dec 4", value: 1 }]
    },
    {
      title: "Errors",
      value: "0",
      secondaryValue: "1",
      data: [{ date: "Dec 4", value: 0 }]
    },
    {
      title: "Tokens",
      value: "71",
      secondaryValue: "71",
      data: [{ date: "Dec 4", value: 71 }]
    }
  ]

  // Run-specific Gantt data so Previous/Next run show different bar timings
  const runGanttNodes = useMemo(
    () => varyGanttNodesByRunId(selectedRunId ?? "", GANTT_NODES),
    [selectedRunId]
  )

  // Run detail subpage with main content + sidebar
  const selectedRun = mockRuns.find((r) => r.runId === selectedRunId)
  if (selectedRunId && selectedRun) {
    return (
      <div className="flex h-full bg-background overflow-hidden">
        {/* Left: main content */}
        <div className="flex flex-1 flex-col min-w-0 overflow-hidden bg-muted">
          <div className="flex items-center flex-shrink-0 px-10 py-4">
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 -ml-2 text-muted-foreground hover:text-foreground"
              onClick={() => {
                setSelectedRunId(null)
                setSelectedGanttNode(null)
              }}
            >
              <ChevronLeft className="h-4 w-4" />
              Back to Analytics
            </Button>
          </div>
          <div className="flex-1 overflow-auto px-10 pb-6">
            <div className="flex items-center justify-between gap-4 mb-1">
              <h1 className="text-xl font-semibold tracking-tight">Run Details</h1>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-muted-foreground hover:text-foreground"
                  disabled={!selectedRun || mockRuns.findIndex((r) => r.runId === selectedRunId) <= 0}
                  onClick={() => {
                    const idx = mockRuns.findIndex((r) => r.runId === selectedRunId)
                    if (idx > 0) {
                      setSelectedRunId(mockRuns[idx - 1].runId)
                      setSelectedGanttNode(null)
                    }
                  }}
                  aria-label="Previous run"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous run
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-muted-foreground hover:text-foreground"
                  disabled={!selectedRun || mockRuns.findIndex((r) => r.runId === selectedRunId) >= mockRuns.length - 1}
                  onClick={() => {
                    const idx = mockRuns.findIndex((r) => r.runId === selectedRunId)
                    if (idx >= 0 && idx < mockRuns.length - 1) {
                      setSelectedRunId(mockRuns[idx + 1].runId)
                      setSelectedGanttNode(null)
                    }
                  }}
                  aria-label="Next run"
                >
                  Next run
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-6">Inspect a single Run. Click on a node to see inputs and outputs.</p>
            <WorkflowGantt
              nodes={runGanttNodes}
              selectedNodeId={selectedGanttNode?.id ?? null}
              onNodeSelect={setSelectedGanttNode}
              highlightNodeId={hoveredContextNodeId}
            />
          </div>
        </div>

        {/* Right: Run sidebar - can be closed when on General */}
        {sidebarOpen && (
        <aside className="w-96 border-l border-border bg-card flex-shrink-0 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-border gap-2">
            <div className="flex items-center gap-1 min-w-0">
              {selectedGanttNode && !sidebarShowGeneral ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 -ml-1"
                  onClick={() => {
                    setSidebarShowGeneral(true)
                    setSelectedGanttNode(null)
                  }}
                  aria-label="Back to General"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              ) : null}
              <div className="flex items-center gap-2 min-w-0">
                <h2 className="text-base font-semibold truncate">
                  {!selectedGanttNode || sidebarShowGeneral
                    ? "General"
                    : selectedGanttNode.label === "AI Agent"
                      ? "AI Agent"
                      : selectedGanttNode.label}
                </h2>
                {selectedGanttNode && !sidebarShowGeneral && (
                  <>
                    <span
                      className="shrink-0 rounded-md border border-border/60 bg-background py-0.5 px-1.5 text-[11px] font-medium text-muted-foreground"
                      title={`Identifier: ${getNodeIdentifier(selectedGanttNode, GANTT_NODES)}`}
                    >
                      {getNodeIdentifier(selectedGanttNode, GANTT_NODES)}
                    </span>
                    <span className="shrink-0 text-[11px] font-medium text-muted-foreground tabular-nums">
                      {(selectedGanttNode.endSec - selectedGanttNode.startSec).toFixed(1)}s
                    </span>
                  </>
                )}
                {(!selectedGanttNode || sidebarShowGeneral) && selectedRun && (
                  <span
                    className={cn(
                      "shrink-0 px-2.5 py-0.5 text-xs font-medium rounded-full",
                      selectedRun.status === "success"
                        ? "bg-green-100 text-green-700"
                        : selectedRun.status === "error"
                          ? "bg-red-100 text-red-700"
                          : "bg-amber-100 text-amber-700"
                    )}
                  >
                    {selectedRun.status === "success"
                      ? "Success"
                      : selectedRun.status === "error"
                        ? "Failure"
                        : "Running"}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              {onSwitchToWorkflow && selectedGanttNode && !sidebarShowGeneral && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={onSwitchToWorkflow}
                  aria-label="Locate in workflow"
                  title="Locate in workflow"
                >
                  <Locate className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close panel"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {(() => {
            const isAiAgent = selectedGanttNode?.label === "AI Agent"
            const triggerClass = "rounded-md px-4 text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
            if (!selectedGanttNode || sidebarShowGeneral) {
              return (
                <div key="general-details" className="flex-1 flex flex-col min-h-0 p-4 overflow-auto">
                  <div className="flex flex-col text-sm">
                    {[
                      { icon: Hash, label: "Run ID", value: selectedRun.runId },
                      { icon: MessageCircle, label: "Conversation ID", value: selectedRun.conversationId },
                      { icon: CalendarIcon, label: "Date", value: selectedRun.created },
                      { icon: Clock, label: "Duration", value: selectedRun.latency },
                      { icon: Bot, label: "AI Model", value: "OpenAI" },
                      { icon: User, label: "User ID", value: selectedRun.user },
                      { icon: Link2, label: "Used Tokens", value: String(selectedRun.tokens) },
                      { icon: ArrowDownToLine, label: "Input", value: selectedRun.input || "—" },
                      { icon: ArrowUpFromLine, label: "Output", value: selectedRun.output || "—" },
                      { icon: AlertCircle, label: "Errors", value: selectedRun.status === "error" ? selectedRun.output || "Error" : "N/A" },
                    ].map(({ icon: Icon, label, value }) =>
                      label === "Input" || label === "Output" ? (
                        <div key={label} className="py-3 border-b border-border/60 last:border-b-0">
                          <div className="flex items-center gap-2.5 mb-2">
                            <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <span className="text-muted-foreground font-medium">{label}</span>
                          </div>
                          <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm text-foreground/90 whitespace-pre-wrap break-words">
                            {value}
                          </div>
                        </div>
                      ) : (
                        <div key={label} className="flex items-center justify-between gap-4 py-3 border-b border-border/60 last:border-b-0">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <span className="text-muted-foreground font-medium">{label}</span>
                          </div>
                          <span className={cn("text-right font-mono text-xs truncate max-w-[200px]", label === "Run ID" && "text-[11px]")} title={value}>
                            {value}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )
            }
            if (isAiAgent) {
              return (
              <Tabs key="ai-agent" defaultValue="completion" className="flex-1 flex flex-col min-h-0 p-4 gap-4">
                <TabsList className="w-fit rounded-lg bg-muted p-1 h-9">
                  <TabsTrigger value="context" className={triggerClass}>Context</TabsTrigger>
                  <TabsTrigger value="input" className={triggerClass}>input</TabsTrigger>
                  <TabsTrigger value="tools" className={triggerClass}>Tools</TabsTrigger>
                  <TabsTrigger value="completion" className={triggerClass}>Completion</TabsTrigger>
                </TabsList>
                <TabsContent value="context" className="flex-1 mt-0 overflow-auto">
                  {(() => {
                    const { inputFrom, outputTo } = getNodeContext(selectedGanttNode, runGanttNodes)
                    return (
                      <div className="flex flex-col gap-4">
                        <div>
                          <div className="text-sm font-medium flex items-center gap-2 py-1 text-muted-foreground">
                            <ArrowLeft className="h-4 w-4" />
                            Receives input from:
                          </div>
                          {inputFrom.length === 0 ? (
                            <p className="text-xs text-muted-foreground py-1">No upstream node.</p>
                          ) : (
                            inputFrom.map((n) => (
                              <button
                                key={n.id}
                                type="button"
                                className="flex w-full items-center gap-2 rounded-md bg-muted/20 py-2 px-3 text-left hover:bg-muted/30 hover:border-border/50 border border-transparent cursor-pointer transition-colors"
                                onClick={() => setSelectedGanttNode(n)}
                                onMouseEnter={() => setHoveredContextNodeId(n.id)}
                                onMouseLeave={() => setHoveredContextNodeId(null)}
                              >
                                <GanttNodeIcon type={n.icon} />
                                <span className="text-sm font-medium truncate flex-1 min-w-0">{n.label}</span>
                                <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">{(n.endSec - n.startSec).toFixed(1)}</span>
                              </button>
                            ))
                          )}
                        </div>
                        <Separator className="my-0" />
                        <div>
                          <div className="text-sm font-medium flex items-center gap-2 py-1 text-muted-foreground">
                            <ArrowRight className="h-4 w-4" />
                            Sends Output to:
                          </div>
                          {outputTo.length === 0 ? (
                            <p className="text-xs text-muted-foreground py-1">No downstream node.</p>
                          ) : (
                            outputTo.map((n) => (
                              <button
                                key={n.id}
                                type="button"
                                className="flex w-full items-center gap-2 rounded-md bg-muted/20 py-2 px-3 text-left hover:bg-muted/30 hover:border-border/50 border border-transparent cursor-pointer transition-colors"
                                onClick={() => setSelectedGanttNode(n)}
                                onMouseEnter={() => setHoveredContextNodeId(n.id)}
                                onMouseLeave={() => setHoveredContextNodeId(null)}
                              >
                                <GanttNodeIcon type={n.icon} />
                                <span className="text-sm font-medium truncate flex-1 min-w-0">{n.label}</span>
                                <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">{(n.endSec - n.startSec).toFixed(1)}</span>
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )
                  })()}
                </TabsContent>
                <TabsContent value="input" className="flex-1 p-4 mt-0 overflow-auto">
                  <p className="text-sm text-muted-foreground">Input for AI Agent.</p>
                </TabsContent>
                <TabsContent value="tools" className="flex-1 p-4 mt-0 overflow-auto">
                  <p className="text-sm text-muted-foreground">Tools invoked by AI Agent.</p>
                </TabsContent>
                <TabsContent value="completion" className="flex-1 mt-0 overflow-hidden flex flex-col min-h-0">
                  <div className="flex flex-1 flex-col gap-2 min-h-0">
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Tabs defaultValue="formatted" className="w-fit">
                        <TabsList className="rounded-lg bg-muted p-1 h-8">
                          <TabsTrigger value="text" className="rounded-md px-3 text-xs text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm h-7">Text</TabsTrigger>
                          <TabsTrigger value="formatted" className="rounded-md px-3 text-xs text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm h-7">Formatted</TabsTrigger>
                        </TabsList>
                      </Tabs>
                      <div className="ml-auto flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => navigator.clipboard.writeText(getAiAgentTabContent(selectedGanttNode?.id ?? "").completion)}
                          title="Copy"
                          aria-label="Copy"
                        >
                          <Copy className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            const text = getAiAgentTabContent(selectedGanttNode?.id ?? "").completion
                            const blob = new Blob([text], { type: "text/plain" })
                            const url = URL.createObjectURL(blob)
                            const a = document.createElement("a")
                            a.href = url
                            a.download = `completion-${selectedGanttNode?.id ?? "agent"}.txt`
                            a.click()
                            URL.revokeObjectURL(url)
                          }}
                          title="Download"
                          aria-label="Download"
                        >
                          <Download className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                    </div>
                    <div className="relative rounded-lg border border-border bg-muted/30 p-3 flex-1 min-h-0 text-sm overflow-auto">
                      <p className="text-foreground/90 whitespace-pre-wrap break-words pr-8">
                        {getAiAgentTabContent(selectedGanttNode?.id ?? "").completion}
                      </p>
                      <button
                        type="button"
                        className="absolute top-2 right-2 p-1.5 rounded-md bg-background/80 hover:bg-background border border-border/50 hover:border-border shadow-sm transition-colors z-10"
                        onClick={(e) => {
                          e.stopPropagation()
                          setCompletionModalOpen(true)
                        }}
                        title="Expand in modal"
                        aria-label="Expand in modal"
                      >
                        <Maximize2 className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
              )
            }
            return (
              <Tabs key={selectedGanttNode?.id ?? "general"} defaultValue="output" className="flex-1 flex flex-col min-h-0 p-4 gap-3">
                <TabsList className="w-fit rounded-lg bg-muted p-1 h-9 flex-shrink-0">
                  <TabsTrigger value="context" className="rounded-md px-4 text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                    Context
                  </TabsTrigger>
                  <TabsTrigger value="input" className="rounded-md px-4 text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                    Input
                  </TabsTrigger>
                  <TabsTrigger value="output" className="rounded-md px-4 text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                    Output
                  </TabsTrigger>
                </TabsList>
                {selectedGanttNode?.status === "error" && (
                  <Alert variant="destructive" className="rounded-lg border-destructive/50 bg-destructive/5 [&>svg]:text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle className="font-semibold text-destructive">This node failed</AlertTitle>
                    <AlertDescription className="flex flex-col gap-3 text-destructive/90">
                      <p className="text-sm">
                        {selectedGanttNode?.label} did not complete successfully. Check the output for details or get help resolving the issue.
                      </p>
                      <Button size="sm" variant="outline" className="w-fit gap-2 border-destructive/40 bg-destructive/5 text-destructive hover:bg-destructive/10 hover:border-destructive/60">
                        <Bot className="h-3.5 w-3.5" />
                        Ask AI
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}
                <TabsContent value="context" className="flex-1 mt-0 overflow-auto min-h-0 flex flex-col gap-4">
                  {(() => {
                    const { inputFrom, outputTo } = getNodeContext(selectedGanttNode, runGanttNodes)
                    return (
                      <div className="flex flex-col gap-4 pr-1">
                        <div>
                          <div className="text-sm font-medium flex items-center gap-2 py-1 text-muted-foreground">
                            <ArrowLeft className="h-4 w-4" />
                            Receives input from:
                          </div>
                          {inputFrom.length === 0 ? (
                            <p className="text-xs text-muted-foreground py-1">No upstream node (this node starts first or has no prior node).</p>
                          ) : (
                            inputFrom.map((n) => (
                              <button
                                key={n.id}
                                type="button"
                                className="flex w-full items-center gap-2 rounded-md bg-muted/20 py-2 px-3 text-left hover:bg-muted/30 hover:border-border/50 border border-transparent cursor-pointer transition-colors"
                                onClick={() => setSelectedGanttNode(n)}
                                onMouseEnter={() => setHoveredContextNodeId(n.id)}
                                onMouseLeave={() => setHoveredContextNodeId(null)}
                              >
                                <GanttNodeIcon type={n.icon} />
                                <span className="text-sm font-medium truncate flex-1 min-w-0">{n.label}</span>
                                <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">{(n.endSec - n.startSec).toFixed(1)}</span>
                              </button>
                            ))
                          )}
                        </div>
                        <Separator className="my-0" />
                        <div>
                          <div className="text-sm font-medium flex items-center gap-2 py-1 text-muted-foreground">
                            <ArrowRight className="h-4 w-4" />
                            Sends Output to:
                          </div>
                          {outputTo.length === 0 ? (
                            <p className="text-xs text-muted-foreground py-1">No downstream node (this node is last or output is terminal).</p>
                          ) : (
                            outputTo.map((n) => (
                              <button
                                key={n.id}
                                type="button"
                                className="flex w-full items-center gap-2 rounded-md bg-muted/20 py-2 px-3 text-left hover:bg-muted/30 hover:border-border/50 border border-transparent cursor-pointer transition-colors"
                                onClick={() => setSelectedGanttNode(n)}
                                onMouseEnter={() => setHoveredContextNodeId(n.id)}
                                onMouseLeave={() => setHoveredContextNodeId(null)}
                              >
                                <GanttNodeIcon type={n.icon} />
                                <span className="text-sm font-medium truncate flex-1 min-w-0">{n.label}</span>
                                <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">{(n.endSec - n.startSec).toFixed(1)}</span>
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )
                  })()}
                </TabsContent>
                <TabsContent value="input" className="flex-1 mt-0 overflow-hidden min-h-0 flex flex-col">
                  <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm flex-1 min-h-0 overflow-auto flex flex-col">
                    <p className="text-foreground/90 whitespace-pre-wrap break-words">
                      {getNodeInputOutput(selectedGanttNode).input}
                    </p>
                  </div>
                </TabsContent>
                <TabsContent value="output" className="flex-1 mt-3 overflow-hidden min-h-0 flex flex-col">
                  <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm flex-1 min-h-0 overflow-auto flex flex-col">
                    {selectedGanttNode?.status === "error" ? (
                      <p className="text-muted-foreground">No output (this node failed).</p>
                    ) : (
                      <p className="text-foreground/90 whitespace-pre-wrap break-words">
                        {getNodeInputOutput(selectedGanttNode).output}
                      </p>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            )
          })()}
        </aside>
        )}
        {/* Completion expand modal - slide-in from right like NodeDetailModal */}
        {completionModalOpen &&
          createPortal(
            <>
              <div
                data-completion-modal="backdrop"
                className="fixed inset-0 bg-black/20 z-[100]"
                onClick={() => setCompletionModalOpen(false)}
                aria-hidden
              />
              <div
                data-completion-modal="content"
                className="fixed right-0 top-0 bottom-0 z-[101] flex flex-col bg-card shadow-2xl rounded-l-lg overflow-hidden"
                style={{
                  marginTop: "24px",
                  marginBottom: "24px",
                  marginRight: "24px",
                  height: "calc(100vh - 48px)",
                  width: "60%",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex flex-1 flex-col overflow-hidden min-h-0">
                  <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
                    <h2 className="text-xl font-semibold">AI Agent – Completion</h2>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => setCompletionModalOpen(false)}
                      aria-label="Close"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex-1 flex flex-col min-h-0 p-6 overflow-hidden">
                    <div className="flex items-center gap-2 flex-shrink-0 mb-4">
                      <Tabs defaultValue="formatted" className="w-fit">
                        <TabsList className="rounded-lg bg-muted p-1 h-8">
                          <TabsTrigger value="text" className="rounded-md px-3 text-xs text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm h-7">Text</TabsTrigger>
                          <TabsTrigger value="formatted" className="rounded-md px-3 text-xs text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm h-7">Formatted</TabsTrigger>
                        </TabsList>
                      </Tabs>
                      <div className="ml-auto flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => navigator.clipboard.writeText(getAiAgentTabContent(selectedGanttNode?.id ?? "").completion)}
                          title="Copy"
                          aria-label="Copy"
                        >
                          <Copy className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            const text = getAiAgentTabContent(selectedGanttNode?.id ?? "").completion
                            const blob = new Blob([text], { type: "text/plain" })
                            const url = URL.createObjectURL(blob)
                            const a = document.createElement("a")
                            a.href = url
                            a.download = `completion-${selectedGanttNode?.id ?? "agent"}.txt`
                            a.click()
                            URL.revokeObjectURL(url)
                          }}
                          title="Download"
                          aria-label="Download"
                        >
                          <Download className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                    </div>
                    <div className="rounded-lg border border-border bg-muted/30 p-4 flex-1 min-h-0 text-sm overflow-auto">
                      <p className="text-foreground/90 whitespace-pre-wrap break-words">
                        {getAiAgentTabContent(selectedGanttNode?.id ?? "").completion}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </>,
            document.body
          )}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Header Section */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0 bg-muted">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Last 7 days
          </Button>
          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <CalendarIcon className="h-4 w-4" />
                {format(dateRange.from, "MMM dd, yyyy")} - {format(dateRange.to, "MMM dd, yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={(range: { from?: Date; to?: Date } | undefined) => {
                  if (range?.from && range?.to) {
                    setDateRange({ from: range.from, to: range.to })
                    setIsCalendarOpen(false)
                  } else if (range?.from) {
                    setDateRange({ from: range.from, to: range.from })
                  }
                }}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Workflow className="h-4 w-4" />
            Flow Report
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            Download Logs
          </Button>
        </div>
      </div>

      {/* Content Area with Side Pane */}
      <div className="flex flex-1 overflow-hidden">
        {/* Main Content */}
        <div className="flex-1 overflow-auto px-6 py-4 bg-muted">
        {/* Metrics Cards */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {metrics.map((metric, index) => (
            <Card key={index} className="py-3">
              <CardHeader className="pb-2 px-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <CardTitle className="text-xs font-medium">{metric.title}</CardTitle>
                    <Info className="h-3 w-3 text-muted-foreground" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 px-4 pb-3">
                <div className="flex flex-col gap-1">
                  <div className="text-lg font-semibold">{metric.value}</div>
                  <div className="text-xs text-muted-foreground">{metric.secondaryValue}</div>
                  {/* Mini Chart */}
                  <div className="h-10 mt-1 relative">
                    <svg className="w-full h-full" viewBox="0 0 100 60" preserveAspectRatio="none">
                      {/* Chart line/bar */}
                      {metric.title === "Tokens" ? (
                        <>
                          <rect 
                            x="40" 
                            y={60 - (metric.data[0].value / 71) * 40} 
                            width="20" 
                            height={(metric.data[0].value / 71) * 40}
                            fill="currentColor"
                            className="text-primary"
                            opacity="0.8"
                          />
                        </>
                      ) : (
                        <>
                          <line
                            x1="10"
                            y1="30"
                            x2="90"
                            y2="30"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            className="text-muted-foreground"
                          />
                          {metric.data[0].value > 0 && (
                            <circle
                              cx="50"
                              cy="30"
                              r="3"
                              fill="currentColor"
                              className="text-primary"
                            />
                          )}
                        </>
                      )}
                    </svg>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters - outside card */}
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                Columns
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {/* Column visibility options would go here */}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Data Table */}
        <Card className="py-4 gap-0">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-medium">Run ID</TableHead>
                    <TableHead className="font-medium">Conversation ID</TableHead>
                    <TableHead className="font-medium">
                      <div className="flex items-center gap-1">
                        Created
                        <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                    </TableHead>
                    <TableHead className="font-medium">
                      <div className="flex items-center gap-1">
                        Status
                        <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                    </TableHead>
                    <TableHead className="font-medium">
                      <div className="flex items-center gap-1">
                        Input(s)
                        <Search className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                    </TableHead>
                    <TableHead className="font-medium">
                      <div className="flex items-center gap-1">
                        Output(s)
                        <Search className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                    </TableHead>
                    <TableHead className="font-medium">
                      <div className="flex items-center gap-1">
                        Latency
                        <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                    </TableHead>
                    <TableHead className="font-medium">Tokens</TableHead>
                    <TableHead className="font-medium">
                      <div className="flex items-center gap-1">
                        User
                        <Search className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockRuns.map((run) => (
                    <TableRow
                      key={run.runId}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedRunId(run.runId)}
                    >
                      <TableCell className="font-mono text-xs">{run.runId}</TableCell>
                      <TableCell className="text-muted-foreground">{run.conversationId}</TableCell>
                      <TableCell>{run.created}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "h-2 w-2 rounded-full",
                            run.status === "success" ? "bg-green-500" : 
                            run.status === "error" ? "bg-red-500" : 
                            "bg-yellow-500"
                          )} />
                          <span className="capitalize">{run.status}</span>
                        </div>
                      </TableCell>
                      <TableCell>{run.input}</TableCell>
                      <TableCell>{run.output}</TableCell>
                      <TableCell>{run.latency}</TableCell>
                      <TableCell>{run.tokens}</TableCell>
                      <TableCell>{run.user}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {/* Pagination */}
            <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border">
              <Button variant="ghost" size="sm" disabled>
                &lt; Previous
              </Button>
              <Button variant="ghost" size="sm">
                Next &gt;
              </Button>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  )
}
