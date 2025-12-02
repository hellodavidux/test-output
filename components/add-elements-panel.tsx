"use client"

import type React from "react"
import { Home } from "lucide-react"

import { useState, useEffect, useRef, type DragEvent } from "react"
import {
  Blocks,
  Code,
  Wrench,
  ChevronDown,
  Search,
  X,
  Zap,
  Play,
  Pencil,
  FileText,
  Link,
  Mic,
  Box,
  BookOpen,
  ArrowDownUp,
  Bot,
  GitBranch,
  Repeat,
  StickyNote,
  MessageSquare,
  Clock,
  Share2,
  Database,
  Table,
  Webhook,
  GripVertical,
  Pin,
  PinOff,
  CheckCircle,
  AlertCircle,
} from "lucide-react"

// Workflow icon component for Logic tab
const WorkflowIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <rect width="8" height="8" x="3" y="3" rx="2" />
    <path d="M7 11v4a2 2 0 0 0 2 2h4" />
    <rect width="8" height="8" x="13" y="13" rx="2" />
  </svg>
)

// Play icon component for Actions & Outputs tab
const PlayIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z" />
  </svg>
)
import SlackIconComponent from "./SlackIcon"
import StackAIIcon from "./StackAIIcon"
import AnthropicIcon from "./AnthropicIcon"
import AirtableIcon from "./AirtableIcon"
import AppIcon from "./AppIcon"
import nodesData from "@/nodes.json"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Kbd } from "@/components/ui/kbd"
import type { SelectedAction, AppDetail, Category } from "@/lib/types"

// =============================================================================
// DATA: App details with triggers and actions
// =============================================================================

const appDetails: Record<string, AppDetail> = {
  Slack: {
    tags: ["slack"],
    triggers: [
      { name: "On App Mention", description: "Triggered when your app is mentioned in a channel" },
      { name: "On New Message", description: "Triggered when a new message is posted" },
      { name: "On Channel Created", description: "Triggered when a new channel is created" },
      { name: "On Reaction Added", description: "Triggered when a reaction is added to a message" },
    ],
    actionGroups: [
      {
        name: "Channels",
        items: [
          { name: "Create Channel", description: "Create a new public or private Slack channel" },
          { name: "Archive Channel", description: "Archive an existing Slack channel" },
          { name: "Get Channel Info", description: "Get detailed information about a channel" },
          { name: "List Channels", description: "List all channels in the workspace" },
          { name: "Invite to Channel", description: "Invite a user to a channel" },
          { name: "Set Channel Topic", description: "Set the topic for a channel" },
        ],
      },
      {
        name: "Messages",
        items: [
          { name: "Send Message", description: "Send a message to a channel or user" },
          { name: "Update Message", description: "Update an existing message" },
          { name: "Delete Message", description: "Delete a message from a channel" },
          { name: "Schedule Message", description: "Schedule a message to be sent later" },
          { name: "Get Permalink", description: "Get a permanent link to a message" },
          { name: "Add Reaction", description: "Add an emoji reaction to a message" },
        ],
      },
      {
        name: "Files",
        items: [
          { name: "Upload File", description: "Upload a file to Slack" },
          { name: "Download Slack File", description: "Download a file from Slack" },
          { name: "Delete Slack File", description: "Delete a file from Slack" },
          { name: "Get Slack File Info", description: "Get information about a file" },
          { name: "List Files", description: "List all files in the workspace" },
        ],
      },
      {
        name: "Users",
        items: [
          { name: "Get User Info", description: "Get information about a user" },
          { name: "List Users", description: "List all users in the workspace" },
          { name: "Get User Presence", description: "Get a user's current presence status" },
          { name: "Set User Status", description: "Set the status for the authenticated user" },
          { name: "Lookup by Email", description: "Find a user by their email address" },
        ],
      },
    ],
  },
  StackAI: {
    tags: ["stackai"],
    triggers: [
      { name: "On Task Completion", description: "Triggered when a task is completed" },
      { name: "On Error", description: "Triggered when an error occurs" },
    ],
    actionGroups: [
      {
        name: "Code Tools",
        items: [{ name: "Analysis Tool", description: "A tool to analyze data, create charts and visualizations" }],
      },
      {
        name: "Document Tools",
        items: [
          { name: "Split Files", description: "Split text content from files into smaller chunks" },
          { name: "Create Spreadsheet File", description: "Create a CSV or Excel file from JSON structured data" },
          { name: "Create Slides", description: "A tool to create HTML slides from a presentation outline" },
          { name: "Document Q&A", description: "Answer questions about documents using AI" },
          {
            name: "Extract JSON Data with JMESPath",
            description: "Extract data from JSON objects using JMESPath queries",
          },
          { name: "Convert Markdown to File", description: "Convert markdown content to PDF, DOCX or other formats" },
          { name: "Page Split", description: "A tool to split a file into multiple file references" },
          { name: "Parse Files", description: "A tool to parse a file into multiple citations" },
        ],
      },
      {
        name: "Email Tools",
        items: [{ name: "Send Email", description: "Send an email using StackAI's email service" }],
      },
      {
        name: "Web Search Tools",
        items: [{ name: "Web Search", description: "Search the web for information with optional filters" }],
      },
      {
        name: "Computer Tools",
        items: [
          { name: "Browser Navigation", description: "Execute browser navigation commands" },
          { name: "Code Execution", description: "Execute code in Python, JavaScript, R, and more" },
          { name: "File Navigation", description: "Navigate and extract content from PDF and other files" },
          { name: "Terminal", description: "Execute a terminal command in the computer environment" },
        ],
      },
      {
        name: "AI Tasks",
        items: [
          { name: "Run Task", description: "Run an AI task" },
          { name: "Cancel Task", description: "Cancel an AI task" },
        ],
      },
    ],
  },
  Airtable: {
    tags: ["airtable"],
    triggers: [
      { name: "On Record Created", description: "Triggered when a new record is created" },
      { name: "On Record Updated", description: "Triggered when a record is updated" },
      { name: "On Record Deleted", description: "Triggered when a record is deleted" },
    ],
    actionGroups: [
      {
        name: "Records",
        items: [
          { name: "Create Record", description: "Create a new record in a table" },
          { name: "Update Record", description: "Update an existing record" },
          { name: "Delete Record", description: "Delete a record from a table" },
          { name: "Get Record", description: "Get a single record by ID" },
          { name: "List Records", description: "List all records in a table" },
          { name: "Search Records", description: "Search for records matching criteria" },
        ],
      },
      {
        name: "Tables",
        items: [
          { name: "Create Table", description: "Create a new table in a base" },
          { name: "Get Table Schema", description: "Get the schema of a table" },
          { name: "List Tables", description: "List all tables in a base" },
        ],
      },
      {
        name: "Bases",
        items: [
          { name: "List Bases", description: "List all accessible bases" },
          { name: "Get Base Schema", description: "Get the schema of a base" },
        ],
      },
    ],
  },
  Anthropic: {
    tags: ["anthropic"],
    triggers: [{ name: "On Response Complete", description: "Triggered when a model response is complete" }],
    actionGroups: [
      {
        name: "Messages",
        items: [
          { name: "Create Message", description: "Send a message to Claude and get a response" },
          { name: "Create Streaming Message", description: "Stream a message response from Claude" },
        ],
      },
      {
        name: "Models",
        items: [
          { name: "List Models", description: "List available Claude models" },
          { name: "Get Model Info", description: "Get information about a specific model" },
        ],
      },
      {
        name: "Embeddings",
        items: [
          { name: "Create Embedding", description: "Generate embeddings for text" },
          { name: "Batch Embeddings", description: "Generate embeddings for multiple texts" },
        ],
      },
    ],
  },
  "Google Drive": {
    tags: ["googledrive"],
    triggers: [
      { name: "On File Created", description: "Triggered when a new file is created" },
      { name: "On File Updated", description: "Triggered when a file is updated" },
    ],
    actionGroups: [
      {
        name: "Files",
        items: [
          { name: "Upload File", description: "Upload a file to Google Drive" },
          { name: "Download File", description: "Download a file from Google Drive" },
          { name: "List Files", description: "List files in Google Drive" },
        ],
      },
    ],
  },
  Gmail: {
    tags: ["gmail"],
    triggers: [
      { name: "On Email Received", description: "Triggered when a new email is received" },
      { name: "On Email Sent", description: "Triggered when an email is sent" },
    ],
    actionGroups: [
      {
        name: "Messages",
        items: [
          { name: "Send Email", description: "Send an email via Gmail" },
          { name: "Get Email", description: "Get a specific email by ID" },
          { name: "List Emails", description: "List emails from inbox" },
        ],
      },
    ],
  },
  Sheets: {
    tags: ["sheets"],
    triggers: [
      { name: "On Sheet Updated", description: "Triggered when a sheet is updated" },
    ],
    actionGroups: [
      {
        name: "Spreadsheets",
        items: [
          { name: "Read Range", description: "Read data from a range" },
          { name: "Write Range", description: "Write data to a range" },
          { name: "Create Sheet", description: "Create a new spreadsheet" },
        ],
      },
    ],
  },
  Outlook: {
    tags: ["outlook"],
    triggers: [
      { name: "On Email Received", description: "Triggered when a new email is received" },
    ],
    actionGroups: [
      {
        name: "Messages",
        items: [
          { name: "Send Email", description: "Send an email via Outlook" },
          { name: "Get Email", description: "Get a specific email" },
        ],
      },
    ],
  },
  Excel: {
    tags: ["excel"],
    triggers: [
      { name: "On Workbook Updated", description: "Triggered when a workbook is updated" },
    ],
    actionGroups: [
      {
        name: "Workbooks",
        items: [
          { name: "Read Range", description: "Read data from a range" },
          { name: "Write Range", description: "Write data to a range" },
        ],
      },
    ],
  },
  Calendar: {
    tags: ["calendar"],
    triggers: [
      { name: "On Event Created", description: "Triggered when a new calendar event is created" },
      { name: "On Event Updated", description: "Triggered when an event is updated" },
    ],
    actionGroups: [
      {
        name: "Events",
        items: [
          { name: "Create Event", description: "Create a new calendar event" },
          { name: "List Events", description: "List calendar events" },
        ],
      },
    ],
  },
  SharePoint: {
    tags: ["sharepoint"],
    triggers: [
      { name: "On File Created", description: "Triggered when a file is created" },
    ],
    actionGroups: [
      {
        name: "Files",
        items: [
          { name: "Upload File", description: "Upload a file to SharePoint" },
          { name: "Download File", description: "Download a file from SharePoint" },
        ],
      },
    ],
  },
  "Knowledge Base": {
    tags: ["knowledgebase"],
    triggers: [],
    actionGroups: [
      {
        name: "Sources",
        items: [
          { name: "Document Upload", description: "" },
          { name: "Websites", description: "" },
          { name: "Azure Blob Storage", description: "" },
          { name: "Dropbox", description: "" },
          { name: "Google Drive", description: "" },
          { name: "Gmail", description: "" },
          { name: "Jira", description: "" },
          { name: "Notion", description: "" },
          { name: "Outlook (OAuth2)", description: "" },
          { name: "OneDrive (OAuth2)", description: "" },
          { name: "SharePoint (OAuth2)", description: "" },
          { name: "SharePoint", description: "" },
          { name: "SharePoint (NTLM)", description: "" },
          { name: "Coda", description: "" },
          { name: "Confluence (OAuth2)", description: "" },
          { name: "AWS S3", description: "" },
          { name: "ServiceNow", description: "" },
          { name: "Veeva", description: "" },
        ],
      },
    ],
  },
}

const nodeDescriptions: Record<string, string> = {
  // Inputs
  Input: "Accept text or data input from users",
  Files: "Upload and process files in your workflow",
  Trigger: "Start workflow based on external events",
  URL: "Fetch data from a URL endpoint",
  Audio: "Record or process audio input",
  // Outputs
  Output: "Display results to the user",
  Action: "Perform an action based on workflow results",
  Template: "Generate formatted output from templates",
  // Core Nodes
  "AI Agent": "Intelligent agent that can reason and act",
  "Knowledge Base": "Store and retrieve knowledge for AI",
  // Logic
  Condition: "Branch workflow based on conditions",
  Loop: "Repeat actions multiple times",
  Switch: "Route workflow based on multiple conditions",
  Python: "Execute Python code",
  "If/Else": "Conditional branching based on conditions",
  "AI Routing": "Route workflow based on AI decisions",
  "Loop Subflow": "Repeat a subflow multiple times",
  // Utils
  Delay: "Wait for a specified duration",
  "StackAI Project": "Manage StackAI projects",
  "StackAI Project (Beta)": "Manage StackAI projects in beta",
  "Sticky Note": "Create a sticky note",
  "Default Message": "Send a default message",
  "Shared Memory": "Use shared memory for data storage",
  "Dynamic Vector Store": "Manage dynamic vector stores",
  "Text-to-SQL": "Convert text to SQL queries",
  "Search Tables": "Search tables for data",
  "Search Data": "Search data for specific information",
  // Apps without details
  Airtable: "Connect to Airtable databases",
  Anthropic: "Use Anthropic Claude AI models",
}

// =============================================================================
// DATA: Categories and their items
// =============================================================================

const categories: Category[] = [
  {
    name: "Inputs & Outputs",
    icon: ArrowDownUp,
    items: [], // Items handled separately in two-column layout
  },
  {
    name: "Triggers",
    icon: Zap,
    items: [], // Items handled separately in two-column layout
  },
  {
    name: "Core Nodes",
    icon: StackAIIcon,
    items: [
      { name: "StackAI", icon: "stackai" }, // Changed from "box" to "bot"
    ],
  },
  {
    name: "Apps",
    icon: Blocks,
    items: [], // Items handled separately - popular apps first, then all others alphabetically
  },
  {
    name: "Utils",
    icon: Wrench,
    items: [
      // Logic items first
      { name: "Python", icon: "python" },
      { name: "If/Else", icon: "branch" },
      { name: "AI Routing", icon: "branch" },
      { name: "Loop Subflow", icon: "repeat" },
    ],
    utilsCategories: {
      "Miscellaneous": [
        { name: "StackAI Project", icon: "stackai" },
        { name: "StackAI Project (Beta)", icon: "stackai" },
        { name: "Sticky Note", icon: "sticky" },
        { name: "Default Message", icon: "message" },
        { name: "Delay", icon: "clock" },
        { name: "Shared Memory", icon: "share" },
      ],
      "Databases": [
        { name: "Dynamic Vector Store", icon: "database" },
        { name: "Text-to-SQL", icon: "code" },
        { name: "Search Tables", icon: "table" },
        { name: "Search Data", icon: "code" },
      ],
    },
  },
]

const inputItems = [
  { name: "Input", icon: "pencil" },
  { name: "Files", icon: "file" },
  { name: "URL", icon: "link" },
  { name: "Audio", icon: "mic" },
]

const outputItems = [
  { name: "Output", icon: "pencil" },
  { name: "Audio", icon: "mic" },
  { name: "Template", icon: "template" },
]

const builtInTriggers = [
  { name: "Scheduled Execution", icon: "clock" },
  { name: "Webhook", icon: "webhook" },
  { name: "On Task Completion", icon: "check" },
  { name: "On Error", icon: "alert" },
]

const appTriggers = [
  { name: "Slack", icon: "slack" },
  { name: "Google Drive", icon: "box" },
  { name: "Gmail", icon: "box" },
  { name: "Sheets", icon: "box" },
  { name: "Outlook", icon: "box" },
  { name: "Excel", icon: "box" },
  { name: "Calendar", icon: "clock" },
  { name: "SharePoint", icon: "box" },
  { name: "Airtable", icon: "airtable" },
  { name: "Anthropic", icon: "anthropic" },
]

// Sidebar tab configuration with descriptions for tooltips
const categoryTabs = [
  { name: "Inputs and Outputs", key: "Inputs and Outputs", icon: ArrowDownUp },
  { name: "Triggers", key: "Triggers", icon: Zap },
  { name: "StackAI Tools", key: "Core Nodes", icon: StackAIIcon },
  { name: "Apps", key: "Apps", icon: Blocks },
  { name: "Tools & Logic", key: "Utils", icon: Wrench },
]

const popularApps = [
  { name: "Slack", icon: "slack" },
  { name: "Google Drive", icon: "box" },
  { name: "Gmail", icon: "box" },
  { name: "Google Sheets", icon: "box" },
  { name: "Outlook", icon: "box" },
  { name: "Excel", icon: "box" },
  { name: "Google Calendar", icon: "clock" },
  { name: "SharePoint", icon: "box" },
]

// All apps from JSON, sorted alphabetically
const allApps = [
  { name: "Algolia", icon: "box" },
  { name: "Anthropic", icon: "anthropic" },
  { name: "AppFolio", icon: "box" },
  { name: "Asana", icon: "box" },
  { name: "Ashby", icon: "box" },
  { name: "Airtable", icon: "airtable" },
  { name: "AWS Bedrock", icon: "box" },
  { name: "AWS S3", icon: "box" },
  { name: "AWS SQS", icon: "box" },
  { name: "Azure Blob Storage", icon: "box" },
  { name: "Azure OpenAI", icon: "box" },
  { name: "Azure SQL", icon: "box" },
  { name: "BigQuery", icon: "box" },
  { name: "Box", icon: "box" },
  { name: "Braze", icon: "box" },
  { name: "Cerebras", icon: "box" },
  { name: "Clickup", icon: "box" },
  { name: "Coda", icon: "box" },
  { name: "Confluence", icon: "box" },
  { name: "Crunchbase", icon: "box" },
  { name: "Databricks", icon: "box" },
  { name: "DealCloud", icon: "box" },
  { name: "Dovetail", icon: "box" },
  { name: "Dropbox", icon: "box" },
  { name: "DuckDuckGo", icon: "box" },
  { name: "E2B", icon: "box" },
  { name: "Elasticsearch", icon: "box" },
  { name: "Epic FHIR", icon: "box" },
  { name: "Exa AI", icon: "box" },
  { name: "Excel", icon: "box" },
  { name: "Extend", icon: "box" },
  { name: "Fathom", icon: "box" },
  { name: "Firecrawl", icon: "box" },
  { name: "Fred", icon: "box" },
  { name: "Github", icon: "code" },
  { name: "Glean", icon: "box" },
  { name: "Gmail", icon: "box" },
  { name: "Google Calendar", icon: "clock" },
  { name: "Google Chat", icon: "box" },
  { name: "Google Docs", icon: "box" },
  { name: "Google Drive", icon: "box" },
  { name: "Google Sheets", icon: "box" },
  { name: "Google Vertex AI", icon: "box" },
  { name: "Google Workspace", icon: "box" },
  { name: "Groq", icon: "box" },
  { name: "Hightouch", icon: "box" },
  { name: "HubSpot", icon: "box" },
  { name: "HyperBrowser", icon: "box" },
  { name: "Intercom", icon: "box" },
  { name: "Jira", icon: "box" },
  { name: "Linear", icon: "box" },
  { name: "LinkedIn", icon: "box" },
  { name: "Loom", icon: "box" },
  { name: "Looker", icon: "box" },
  { name: "Make", icon: "box" },
  { name: "MCP", icon: "box" },
  { name: "Microsoft Teams", icon: "box" },
  { name: "Miro", icon: "box" },
  { name: "Mistral AI", icon: "box" },
  { name: "MongoDB", icon: "box" },
  { name: "MySQL", icon: "box" },
  { name: "NetSuite", icon: "box" },
  { name: "Notion", icon: "box" },
  { name: "OneDrive", icon: "box" },
  { name: "OpenAI", icon: "box" },
  { name: "Oracle", icon: "box" },
  { name: "Oracle Database", icon: "box" },
  { name: "Outlook", icon: "box" },
  { name: "Outreach", icon: "box" },
  { name: "PandaDoc", icon: "box" },
  { name: "Perplexity", icon: "box" },
  { name: "Pinecone", icon: "box" },
  { name: "PitchBook", icon: "box" },
  { name: "Plaid", icon: "box" },
  { name: "Polygon", icon: "box" },
  { name: "PostgreSQL", icon: "box" },
  { name: "Power BI", icon: "box" },
  { name: "Realtime Chat", icon: "box" },
  { name: "Reducto", icon: "box" },
  { name: "Regex", icon: "box" },
  { name: "Replicate", icon: "box" },
  { name: "RunwayML", icon: "box" },
  { name: "Salesforce", icon: "box" },
  { name: "Sap", icon: "box" },
  { name: "SEC EDGAR", icon: "box" },
  { name: "SerpAPI", icon: "box" },
  { name: "Servicenow", icon: "box" },
  { name: "SharePoint", icon: "box" },
  { name: "Shopify", icon: "box" },
  { name: "Slack", icon: "slack" },
  { name: "Smartsheet", icon: "box" },
  { name: "Snowflake", icon: "box" },
  { name: "S&P Global", icon: "box" },
  { name: "StackAI", icon: "box" },
  { name: "Stripe", icon: "box" },
  { name: "Synapse", icon: "box" },
  { name: "Together AI", icon: "box" },
  { name: "Typeform", icon: "box" },
  { name: "Veeva", icon: "box" },
  { name: "Vlm", icon: "box" },
  { name: "Weaviate", icon: "box" },
  { name: "Wolfram Alpha", icon: "box" },
  { name: "Workable", icon: "box" },
  { name: "Workday", icon: "box" },
  { name: "XAI", icon: "box" },
  { name: "Yahoo Finance", icon: "box" },
  { name: "YouTube", icon: "box" },
  { name: "Zapier", icon: "box" },
  { name: "Zendesk", icon: "box" },
]

// Get popular app names for filtering
const popularAppNames = new Set(popularApps.map(app => app.name))

// Filter out popular apps and sort alphabetically
const otherApps = allApps
  .filter(app => !popularAppNames.has(app.name))
  .sort((a, b) => a.name.localeCompare(b.name))

const popularTools = [
  { name: "AI Agent", icon: "bot", category: "Core Nodes" },
  { name: "Knowledge Base", icon: "book", category: "Core Nodes" },
  { name: "Python", icon: "python", category: "Logic" },
  { name: "If/Else", icon: "branch", category: "Logic" },
  { name: "Delay", icon: "clock", category: "Utils" },
  { name: "Text-to-SQL", icon: "code", category: "Utils" },
]

// =============================================================================
// DATA: Category descriptions for detailed tooltips
// =============================================================================

const categoryDescriptions: Record<string, string> = {
  Home: "Quick access to popular apps and tools",
  Triggers: "Start workflows with events and actions",
  "Core Nodes": "Essential AI and processing nodes",
  Apps: "Connect to external services",
  Utils: "Logic and utility tools",
}

const tabTooltips: Record<string, string> = {
  Popular: "Quick access to popular apps and tools",
  Triggers: "Start your workflow",
  Utils: "Logic and utility functions",
  Apps: "Third-party integrations",
  "Core Nodes": "Essential building blocks",
}

// =============================================================================
// HELPER: Icon component based on type
// =============================================================================

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  pencil: Pencil,
  file: FileText,
  zap: Zap,
  link: Link,
  mic: Mic,
  play: Play,
  template: FileText,
  box: Box,
  book: BookOpen,
  code: Code,
  wrench: Wrench,
  slack: SlackIconComponent,
  stackai: StackAIIcon,
  airtable: AirtableIcon,
  anthropic: AnthropicIcon,
  bot: Bot, // Added Bot icon mapping for AI Agent
  gitbranch: GitBranch,
  repeat: Repeat,
  sticky: StickyNote,
  message: MessageSquare,
  clock: Clock,
  share: Share2,
  database: Database,
  table: Table,
  python: Code,
  branch: GitBranch,
  webhook: Webhook,
  check: CheckCircle,
  alert: AlertCircle,
}

function ItemIcon({ type, muted = false, appName }: { type: string; muted?: boolean; appName?: string }) {
  // If type is "box" and we have an app name, use AppIcon (with brand colors)
  // AppIcon should always render with its natural brand colors, not affected by muted prop
  if (type === "box" && appName) {
    // Wrap in a container that prevents text color inheritance
    return (
      <span className="inline-flex items-center" style={{ color: 'unset' }}>
        <AppIcon appName={appName} className="w-3.5 h-3.5 flex-shrink-0" />
      </span>
    )
  }
  
  const Icon = iconMap[type] || Box
  return <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${muted ? "text-muted-foreground" : "text-foreground"}`} />
}

// =============================================================================
// HELPER: Draggable item wrapper
// =============================================================================

function DraggableItem({
  data,
  onClick,
  className,
  children,
}: {
  data: SelectedAction
  onClick?: () => void
  className?: string
  children: React.ReactNode
}) {
  const handleDragStart = (e: DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData("application/reactflow", JSON.stringify(data))
    e.dataTransfer.effectAllowed = "move"
  }

  const handleClick = (e: React.MouseEvent) => {
    // Only call onClick if it's provided (for non-sidebar sources)
    if (onClick) {
      onClick()
    }
  }

  return (
    <div draggable onDragStart={handleDragStart} onClick={handleClick} className={className}>
      {children}
    </div>
  )
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

type AddElementsPanelProps = {
  onSelectAction?: (action: SelectedAction) => void
  isEmbedded?: boolean
  onClose?: () => void
  source?: "sidebar" | "handle" | "replace" // Source of the panel opening
  isPinned?: boolean
  onPinToggle?: (pinned: boolean) => void
  initialTab?: string // Initial active tab when opening
}

export function AddElementsPanel({ onSelectAction, source = "handle", isPinned = false, onPinToggle, initialTab }: AddElementsPanelProps) {
  const [activeTab, setActiveTab] = useState(initialTab || "Popular")
  
  // Update activeTab when initialTab prop changes
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab)
    }
  }, [initialTab])
  const [searchQuery, setSearchQuery] = useState("")
  const [expandedApp, setExpandedApp] = useState<string | null>(null)
  const [expandedGroups, setExpandedGroups] = useState<string[]>([])
  const [selectedAction, setSelectedAction] = useState<string | null>(null)
  const [triggersExpanded, setTriggersExpanded] = useState(true)
  const [actionsExpanded, setActionsExpanded] = useState(true)
  const [tabKey, setTabKey] = useState(0)
  const [selectedApp, setSelectedApp] = useState<string | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Reset scroll position when tab changes or search query changes
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0
    }
  }, [activeTab, selectedApp, searchQuery])

  const getTabIndex = () => {
    if (activeTab === "Popular") return 0
    const tabIndex = categoryTabs.findIndex((tab) => tab.key === activeTab)
    return tabIndex + 1 // +1 because Popular is index 0
  }

  const handleItemClick = (categoryName: string, item: any) => {
    // For sidebar source, don't navigate to sublevels - items are draggable only
    if (source === "sidebar") {
      return
    }

    const uniqueKey = `${categoryName}-${item.name}`
    const details = appDetails[item.name]

    if (details) {
      setSelectedApp(item.name)
      setSelectedAction(null) // Clear selected action when showing app details
      return
    }

    const description = nodeDescriptions[item.name] || `${item.name} node`
    setSelectedAction(item.name)
    onSelectAction?.({
      appName: item.name,
      actionName: item.name,
      description,
      type: "action",
    })
  }

  const handleTriggerClick = (appName: string, trigger: any) => {
    const description = trigger.description || `${trigger.name} trigger`
    setSelectedAction(trigger.name)
    onSelectAction?.({
      appName: appName,
      actionName: trigger.name,
      description: description,
      type: "trigger",
    })
  }

  const handleActionClick = (appName: string, action: any) => {
    const description = action.description || `${action.name} action`
    setSelectedAction(action.name)
    onSelectAction?.({
      appName: appName,
      actionName: action.name,
      description,
      type: "action",
    })
  }

  const toggleGroup = (groupName: string) => {
    if (expandedGroups.includes(groupName)) {
      setExpandedGroups(expandedGroups.filter((group) => group !== groupName))
    } else {
      setExpandedGroups([...expandedGroups, groupName])
    }
  }

  const handlePopularAppClick = (appName: string) => {
    // For sidebar source, don't navigate to sublevels - apps are draggable only
    if (source === "sidebar") {
      return
    }
    setSelectedApp(appName)
  }

  const handlePopularToolClick = (tool: { name: string; icon: string; category: string }) => {
    // Check if this tool has app details (like Knowledge Base with sublevels)
    const details = appDetails[tool.name]
    
    if (details) {
      setSelectedApp(tool.name)
      setSelectedAction(null) // Clear selected action when showing app details
      return
    }
    
    const description = nodeDescriptions[tool.name] || `${tool.name} node`
    setSelectedAction(tool.name)
    onSelectAction?.({
      appName: tool.name,
      actionName: tool.name,
      description,
      type: "action",
    })
  }

  const handleClose = () => {
    setSelectedApp(null)
  }

  const renderHomeView = () => (
    <div className="p-3 py-0">
      <div className={`grid ${source === "sidebar" ? "grid-cols-1" : "grid-cols-2"} gap-0.5`}>
        {/* Popular Tools Column */}
        <div>
          <div className="sticky top-0 z-10 bg-background py-1 mb-2">
            <h4 className="text-muted-foreground text-sm font-light">Popular</h4>
          </div>
          <div className="space-y-0.5">
            {popularTools.map((tool) => {
              const actionData: SelectedAction = {
                appName: tool.name,
                actionName: tool.name,
                description: nodeDescriptions[tool.name] || `${tool.name} node`,
                type: "action",
              }
              
              if (source === "sidebar") {
                return (
                  <DraggableItem
                    key={tool.name}
                    data={actionData}
                    className="group/item"
                  >
                    <div className="flex items-center justify-between gap-2.5 py-1.5 px-2 rounded-md text-sm cursor-grab hover:bg-accent/50 transition-colors min-w-0">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <ItemIcon type={tool.icon} muted appName={tool.name} />
                        <span className="text-foreground truncate font-medium">{tool.name}</span>
              </div>
                      <GripVertical className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 opacity-0 group-hover/item:opacity-100 transition-all pointer-events-none" />
          </div>
                  </DraggableItem>
                )
              }
              
              const toolDetails = appDetails[tool.name]
              return (
              <div
                key={tool.name}
                className="group/item"
                onMouseEnter={(e) => e.stopPropagation()}
              >
                <div
                  onClick={() => handlePopularToolClick(tool)}
                  className="flex items-center justify-between gap-2.5 py-1.5 px-2 rounded-md text-sm cursor-pointer hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <ItemIcon type={tool.icon} muted />
                    <span className="text-foreground truncate font-medium">{tool.name}</span>
                  </div>
                  {toolDetails && (
                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground -rotate-90 flex-shrink-0 opacity-0 group-hover/item:opacity-100 transition-opacity pointer-events-none" />
                  )}
                </div>
              </div>
              )
            })}
          </div>
        </div>

        {/* Popular Apps Column */}
        <div className={source === "sidebar" ? "mt-4" : ""}>
          <div className="sticky top-0 z-10 bg-background py-1 mb-2">
            <h4 className="text-muted-foreground text-sm font-light">Most used apps</h4>
          </div>
          <div className="space-y-0.5">
            {popularApps.map((app) => {
              const details = appDetails[app.name]
              const actionData: SelectedAction = {
                appName: app.name,
                actionName: app.name,
                description: `${app.name} app`,
                type: "action",
              }
              
              if (source === "sidebar") {
                return (
                  <DraggableItem
                    key={app.name}
                    data={actionData}
                    className="group/item"
                  >
                    <div className="flex items-center justify-between gap-2.5 py-1.5 px-2 rounded-md text-sm cursor-grab hover:bg-accent/50 transition-colors min-w-0">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <ItemIcon type={app.icon} muted />
                        <span className="text-foreground truncate font-medium">{app.name}</span>
      </div>
                      <GripVertical className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 opacity-0 group-hover/item:opacity-100 transition-all pointer-events-none" />
    </div>
                  </DraggableItem>
                )
              }
              
              return (
                <div
                  key={app.name}
                  className="group/item"
                  onMouseEnter={(e) => e.stopPropagation()}
                >
                  <div
                    onClick={() => handlePopularAppClick(app.name)}
                    className="flex items-center justify-between gap-2.5 py-1.5 px-2 rounded-md text-sm cursor-pointer hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <ItemIcon type={app.icon} muted appName={app.name} />
                      <span className="text-foreground truncate font-medium">{app.name}</span>
                    </div>
                    {details && (
                      <ChevronDown className="w-3.5 h-3.5 text-muted-foreground -rotate-90 flex-shrink-0 opacity-0 group-hover/item:opacity-100 transition-all pointer-events-none" />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )

  const renderCoreView = () => {
    const coreTools = [
      // Code Tools
      { name: "Analysis Tool", icon: "code", category: "Code Tools" },
      // Document Tools
      { name: "Split Files", icon: "file", category: "Document Tools" },
      { name: "Create Spreadsheet File", icon: "file", category: "Document Tools" },
      { name: "Create Slides", icon: "file", category: "Document Tools" },
      { name: "Document Q&A", icon: "book", category: "Document Tools" },
      { name: "Extract JSON Data with JMESPath", icon: "code", category: "Document Tools" },
      { name: "Convert Markdown to File", icon: "file", category: "Document Tools" },
      { name: "Page Split", icon: "file", category: "Document Tools" },
      { name: "Parse Files", icon: "file", category: "Document Tools" },
      { name: "PDF to Image", icon: "file", category: "Document Tools" },
      { name: "Summarize Documents", icon: "book", category: "Document Tools" },
      { name: "Transcribe Documents", icon: "file", category: "Document Tools" },
      { name: "Translate Documents", icon: "file", category: "Document Tools" },
      // Time Tools
      { name: "Current Time", icon: "clock", category: "Time Tools" },
      { name: "Weekday Calculator", icon: "clock", category: "Time Tools" },
      // Web Tools
      { name: "Deep Research", icon: "link", category: "Web Tools" },
      { name: "Get Website as Markdown", icon: "link", category: "Web Tools" },
      { name: "Job Search", icon: "link", category: "Web Tools" },
      { name: "News Search", icon: "link", category: "Web Tools" },
      { name: "Send HTTP Request", icon: "link", category: "Web Tools" },
      // Knowledge Base Tools
      { name: "List Knowledge Base Contents", icon: "database", category: "Knowledge Base Tools" },
      { name: "List Knowledge Bases", icon: "database", category: "Knowledge Base Tools" },
      { name: "Read Knowledge Base File", icon: "database", category: "Knowledge Base Tools" },
      { name: "Search Knowledge Base", icon: "database", category: "Knowledge Base Tools" },
      // Documents Tools
      { name: "Fill PDF Form", icon: "file", category: "Documents Tools" },
      // Workflow Tools
      { name: "Generate StackAI Workflow", icon: "stackai", category: "Workflow Tools" },
      { name: "Get StackAI Action", icon: "stackai", category: "Workflow Tools" },
      { name: "List StackAI Actions", icon: "stackai", category: "Workflow Tools" },
      { name: "List StackAI Triggers", icon: "stackai", category: "Workflow Tools" },
      { name: "Execute StackAI Project", icon: "stackai", category: "Workflow Tools" },
      // Files Tools
      { name: "Download Private File", icon: "file", category: "Files Tools" },
      // Image Tools
      { name: "Convert HTML to Image", icon: "file", category: "Image Tools" },
      { name: "Image-to-Image Transform", icon: "file", category: "Image Tools" },
      { name: "Image to Text", icon: "file", category: "Image Tools" },
      { name: "Text to Image", icon: "file", category: "Image Tools" },
      // Email Tools
      { name: "Send Email", icon: "message", category: "Email Tools" },
      // Web Search Tools
      { name: "Web Search", icon: "link", category: "Web Search Tools" },
      // Computer Tools
      { name: "Browser Navigation", icon: "code", category: "Computer Tools" },
      { name: "Code Execution", icon: "code", category: "Computer Tools" },
      { name: "File Navigation", icon: "file", category: "Computer Tools" },
      { name: "Terminal", icon: "code", category: "Computer Tools" },
    ]

    const groupedTools = coreTools.reduce((acc, tool) => {
      if (!acc[tool.category]) {
        acc[tool.category] = []
      }
      acc[tool.category].push(tool)
      return acc
    }, {} as Record<string, typeof coreTools>)

    const topItems = [
      { name: "AI Agent", icon: "bot" },
      { name: "Knowledge Base", icon: "book" },
    ]

    return (
    <div className="p-3 py-0 min-w-0 overflow-hidden">
        <div className="space-y-3 min-w-0">
          {/* Core Nodes section */}
          <div>
            <div className="sticky top-0 z-10 bg-background py-1 mb-1">
              <div className="px-3 text-sm font-light text-muted-foreground">
                <span>Core Nodes</span>
              </div>
            </div>
            <div className="space-y-0.5 px-2 min-w-0 overflow-hidden">
              {topItems.map((item) => {
                const actionData: SelectedAction = {
                  appName: item.name,
                  actionName: item.name,
                  description: nodeDescriptions[item.name] || `${item.name} node`,
                  type: "action",
                }
                
                if (source === "sidebar") {
                  return (
                    <DraggableItem
                      key={item.name}
                      data={actionData}
                      className="group/item"
                    >
                      <div className="flex items-center justify-between gap-2 py-1 px-2 rounded-md text-sm cursor-grab hover:bg-accent/50 transition-colors min-w-0 overflow-hidden">
                        <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                          <div className="flex-shrink-0">
                            <ItemIcon type={item.icon} appName={item.name} />
                          </div>
                          <span className="text-foreground truncate font-medium min-w-0">{item.name}</span>
                        </div>
                        <GripVertical className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 opacity-0 group-hover/item:opacity-100 transition-all pointer-events-none ml-1" />
                      </div>
                    </DraggableItem>
                  )
                }
                
                return (
                  <div
                    key={item.name}
                    onClick={() => handleItemClick("Core Nodes", item)}
                    className="flex items-center gap-2.5 py-1.5 px-2 rounded-md text-sm cursor-pointer hover:bg-accent/50 transition-colors min-w-0 overflow-hidden"
                  >
                    <div className="flex-shrink-0">
                      <ItemIcon type={item.icon} appName={item.name} />
                    </div>
                    <span className="text-foreground truncate font-medium min-w-0 flex-1">{item.name}</span>
                  </div>
                )
              })}
            </div>
          </div>
          {Object.entries(groupedTools).map(([category, tools]) => (
            <div key={category}>
              <div className="sticky top-0 z-10 bg-background py-1 mb-1">
                <div className="px-3 text-sm font-light text-muted-foreground">
                  <span>{category}</span>
                </div>
              </div>
              <div className="space-y-0.5 px-2 min-w-0 overflow-hidden">
                {tools.map((tool) => {
                  const actionData: SelectedAction = {
                    appName: tool.name,
                    actionName: tool.name,
                    description: nodeDescriptions[tool.name] || `${tool.name} node`,
                    type: "action",
                  }
                  
                  if (source === "sidebar") {
                    return (
                      <DraggableItem
                        key={tool.name}
                        data={actionData}
                        className="group/item"
                      >
                        <div className="flex items-center justify-between gap-2 py-1 px-2 rounded-md text-sm cursor-grab hover:bg-accent/50 transition-colors min-w-0 overflow-hidden">
                          <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                            <div className="flex-shrink-0">
                              <ItemIcon type={tool.icon} />
                            </div>
                            <span className="text-foreground truncate font-medium min-w-0">{tool.name}</span>
                          </div>
                          <GripVertical className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 opacity-0 group-hover/item:opacity-100 transition-all pointer-events-none ml-1" />
                        </div>
                      </DraggableItem>
                    )
                  }
                  
                  return (
                    <div
                      key={tool.name}
                      onClick={() => handleItemClick("Core Nodes", tool)}
                className="flex items-center gap-2.5 py-1.5 px-2 rounded-md text-sm cursor-pointer hover:bg-accent/50 transition-colors min-w-0 overflow-hidden"
              >
                      <div className="flex-shrink-0">
                        <ItemIcon type={tool.icon} />
                      </div>
                      <span className="text-foreground truncate font-medium min-w-0 flex-1">{tool.name}</span>
                    </div>
                  )
                })}
              </div>
              </div>
            ))}
          </div>
        </div>
    )
  }

  const renderTriggersView = () => (
    <div className="p-3 py-0">
      <div className={`grid ${source === "sidebar" ? "grid-cols-1" : "grid-cols-2"} gap-4`}>
        {/* Built-in Triggers Column */}
        <div>
          <div className="sticky top-0 z-10 bg-background py-1 mb-2">
            <h4 className="text-muted-foreground text-sm font-light">Built-in Triggers</h4>
          </div>
          <div className="space-y-0.5 px-0">
            {builtInTriggers.map((item) => {
              const actionData: SelectedAction = {
                appName: item.name,
                actionName: item.name,
                description: nodeDescriptions[item.name] || `${item.name} trigger`,
                type: "trigger",
              }
              
              if (source === "sidebar") {
                return (
                  <DraggableItem
                    key={item.name}
                    data={actionData}
                    className="group/item"
                  >
                    <div className="flex items-center justify-between gap-2.5 py-1.5 px-2 rounded-md text-sm cursor-grab hover:bg-accent/50 transition-colors min-w-0">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <ItemIcon type={item.icon} appName={item.name} />
                        <span className="text-foreground truncate font-medium">{item.name}</span>
                      </div>
                      <GripVertical className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 opacity-0 group-hover/item:opacity-100 transition-all pointer-events-none" />
                    </div>
                  </DraggableItem>
                )
              }
              
              return (
              <div
                key={item.name}
                onClick={() => handleItemClick("Triggers", item)}
                className="flex items-center gap-2.5 py-1.5 px-2 rounded-md text-sm cursor-pointer hover:bg-accent/50 transition-colors"
              >
                <ItemIcon type={item.icon} />
                <span className="text-foreground truncate font-medium">{item.name}</span>
              </div>
              )
            })}
          </div>
        </div>

        {/* App Triggers Column */}
        <div>
          <div className="sticky top-0 z-10 bg-background py-1 mb-2">
            <h4 className="text-muted-foreground text-sm font-light">App Triggers</h4>
          </div>
          <div className="space-y-0.5 px-0">
            {appTriggers.map((app) => {
              const details = appDetails[app.name]
              const actionData: SelectedAction = {
                appName: app.name,
                actionName: app.name,
                description: `${app.name} app`,
                type: "action",
              }
              
              if (source === "sidebar") {
                return (
                  <DraggableItem
                    key={app.name}
                    data={actionData}
                    className="group/item"
                  >
                    <div className="flex items-center justify-between gap-2.5 py-1.5 px-2 rounded-md text-sm cursor-grab hover:bg-accent/50 transition-colors min-w-0">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <ItemIcon type={app.icon} muted />
                        <span className="text-foreground truncate font-medium">{app.name}</span>
      </div>
                      <GripVertical className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 opacity-0 group-hover/item:opacity-100 transition-all pointer-events-none" />
    </div>
                  </DraggableItem>
                )
              }
              
              return (
                <div
                  key={app.name}
                  className="group/item"
                  onMouseEnter={(e) => e.stopPropagation()}
                >
                  <div
                    onClick={() => handlePopularAppClick(app.name)}
                    className="flex items-center justify-between gap-2.5 py-1.5 px-2 rounded-md text-sm cursor-pointer hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <ItemIcon type={app.icon} muted appName={app.name} />
                      <span className="text-foreground truncate font-medium">{app.name}</span>
                    </div>
                    {details && (
                      <ChevronDown className="w-3.5 h-3.5 text-muted-foreground -rotate-90 flex-shrink-0 opacity-0 group-hover/item:opacity-100 transition-all pointer-events-none" />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )

  const renderInputsAndOutputsView = () => (
    <div className="p-3 py-0">
      <div className={`grid ${source === "sidebar" ? "grid-cols-1" : "grid-cols-2"} gap-4`}>
        {/* Inputs Column */}
        <div>
          <h4 className="text-muted-foreground mb-2 text-sm font-light">Inputs</h4>
          <div className="space-y-0.5 px-0">
            {inputItems.map((item) => {
              const actionData: SelectedAction = {
                appName: item.name,
                actionName: item.name,
                description: nodeDescriptions[item.name] || `${item.name} input`,
                type: "action",
              }
              
              if (source === "sidebar") {
                return (
                  <DraggableItem
                    key={item.name}
                    data={actionData}
                    className="group/item"
                  >
                    <div className="flex items-center justify-between gap-2.5 py-1.5 px-2 rounded-md text-sm cursor-grab hover:bg-accent/50 transition-colors min-w-0">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <ItemIcon type={item.icon} appName={item.name} />
                        <span className="text-foreground truncate font-medium">{item.name}</span>
                      </div>
                      <GripVertical className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 opacity-0 group-hover/item:opacity-100 transition-all pointer-events-none" />
                    </div>
                  </DraggableItem>
                )
              }
              
              return (
                <div
                  key={item.name}
                  onClick={() => handleItemClick("Inputs and Outputs", item)}
                  className="flex items-center gap-2.5 py-1.5 px-2 rounded-md text-sm cursor-pointer hover:bg-accent/50 transition-colors"
                >
                  <ItemIcon type={item.icon} appName={item.name} />
                  <span className="text-foreground truncate font-medium">{item.name}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Outputs Column */}
        <div>
          <h4 className="text-muted-foreground mb-2 text-sm font-light">Outputs</h4>
          <div className="space-y-0.5 px-0">
            {outputItems.map((item) => {
              const actionData: SelectedAction = {
                appName: item.name,
                actionName: item.name,
                description: nodeDescriptions[item.name] || `${item.name} output`,
                type: "action",
              }
              
              if (source === "sidebar") {
                return (
                  <DraggableItem
                    key={item.name}
                    data={actionData}
                    className="group/item"
                  >
                    <div className="flex items-center justify-between gap-2.5 py-1.5 px-2 rounded-md text-sm cursor-grab hover:bg-accent/50 transition-colors min-w-0">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <ItemIcon type={item.icon} appName={item.name} />
                        <span className="text-foreground truncate font-medium">{item.name}</span>
                      </div>
                      <GripVertical className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 opacity-0 group-hover/item:opacity-100 transition-all pointer-events-none" />
                    </div>
                  </DraggableItem>
                )
              }
              
              return (
                <div
                  key={item.name}
                  onClick={() => handleItemClick("Inputs and Outputs", item)}
                  className="flex items-center gap-2.5 py-1.5 px-2 rounded-md text-sm cursor-pointer hover:bg-accent/50 transition-colors"
                >
                  <ItemIcon type={item.icon} appName={item.name} />
                  <span className="text-foreground truncate font-medium">{item.name}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )

  const renderAppDetailView = (appName: string) => {
    const details = appDetails[appName]
    if (!details) return null

    return (
      <div className="animate-in fade-in duration-300">
        {/* Triggers Section */}
        {details.triggers.length > 0 && (
          <div className="mt-1">
            <div className="sticky top-0 z-10 bg-background py-1">
              <div className="px-3 flex items-center gap-2 text-sm font-light text-muted-foreground lowercase">
                <Zap className="w-3.5 h-3.5" />
                <span>Triggers</span>
              </div>
            </div>
            <div className="space-y-0.5 px-2 pl-6">
              {details.triggers.map((trigger) => (
                <DraggableItem
                  key={trigger.name}
                  data={{
                    appName: appName,
                    actionName: trigger.name,
                    description: trigger.description,
                    type: "trigger",
                  }}
                  onClick={() => handleTriggerClick(appName, trigger)}
                >
                  <div className="flex items-center gap-2.5 py-1 px-2 rounded-md text-sm cursor-pointer hover:bg-accent/50 transition-colors">
                    <ItemIcon type={appName.toLowerCase()} />
                    <span className="text-foreground truncate font-medium">{trigger.name}</span>
                  </div>
                </DraggableItem>
              ))}
            </div>
          </div>
        )}

        {/* Action Groups */}
        {details.actionGroups.map((group) => (
          <div key={group.name} className="mt-2">
            <div className="sticky top-0 z-10 bg-background py-1">
              <div className="px-3 flex items-center gap-2 text-sm font-light text-muted-foreground lowercase">
                <Play className="w-3.5 h-3.5" />
                <span>{group.name}</span>
              </div>
            </div>
            <div className="space-y-0.5 px-2 pl-6">
              {group.items.map((action) => (
                <DraggableItem
                  key={action.name}
                  data={{
                    appName: appName,
                    actionName: action.name,
                    description: action.description,
                    type: "action",
                  }}
                  onClick={() => handleActionClick(appName, action)}
                >
                  <div className="flex items-center gap-2.5 py-1 px-2 rounded-md text-sm cursor-pointer hover:bg-accent/50 transition-colors">
                    <ItemIcon type={appName.toLowerCase()} />
                    <span className="text-foreground truncate font-medium">{action.name}</span>
                  </div>
                </DraggableItem>
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  const isSearching = searchQuery.trim().length > 0
  const searchLower = searchQuery.toLowerCase().trim()

  // Helper function to normalize text for searching (replace special chars with spaces)
  const normalizeForSearch = (text: string): string => {
    return text.toLowerCase().replace(/[\/\-_]/g, ' ').replace(/\s+/g, ' ').trim()
  }

  // Helper function to check if text matches search query
  const matchesSearch = (text: string): boolean => {
    if (!text) return false
    const normalizedText = normalizeForSearch(text)
    const normalizedSearch = normalizeForSearch(searchLower)
    
    // Check if search query is contained in normalized text
    if (normalizedText.includes(normalizedSearch)) return true
    
    // Check if all words in search query appear in text
    const searchWords = normalizedSearch.split(/\s+/).filter(w => w.length > 0)
    if (searchWords.length > 1) {
      return searchWords.every(word => normalizedText.includes(word))
    }
    
    return normalizedText.includes(normalizedSearch)
  }

  // Helper function to calculate relevance score (higher = better match)
  const getRelevanceScore = (name: string, keywords: string[] = []): number => {
    const nameLower = name.toLowerCase()
    const normalizedName = normalizeForSearch(name)
    const normalizedSearch = normalizeForSearch(searchLower)
    let score = 0
    
    // Exact match gets highest score
    if (nameLower === searchLower) return 1000
    
    // Normalized exact match (e.g., "if else" matches "If/Else")
    if (normalizedName === normalizedSearch) return 900
    
    // Check if all words in search query appear in name (for multi-word searches)
    const searchWords = normalizedSearch.split(/\s+/).filter(w => w.length > 0)
    if (searchWords.length > 1) {
      const allWordsMatch = searchWords.every(word => normalizedName.includes(word))
      if (allWordsMatch) score += 600
    }
    
    // Word boundary match (e.g., "if" in "If/Else") gets high score
    const wordBoundaryRegex = new RegExp(`\\b${searchLower}\\b`, 'i')
    if (wordBoundaryRegex.test(name)) score += 500
    
    // Normalized contains match
    if (normalizedName.includes(normalizedSearch)) score += 400
    
    // Starts with search query
    if (nameLower.startsWith(searchLower)) score += 300
    
    // Contains search query
    if (nameLower.includes(searchLower)) score += 100
    
    // Check keywords for word boundary matches
    keywords.forEach(keyword => {
      const keywordLower = keyword.toLowerCase()
      const normalizedKeyword = normalizeForSearch(keyword)
      if (keywordLower === searchLower) score += 200
      if (normalizedKeyword === normalizedSearch) score += 180
      if (wordBoundaryRegex.test(keywordLower)) score += 150
      if (normalizedKeyword.includes(normalizedSearch)) score += 120
      if (keywordLower.includes(searchLower)) score += 50
    })
    
    return score
  }

  // Helper function to check if any keyword matches
  const matchesKeywords = (keywords: string[]): boolean => {
    if (!keywords || keywords.length === 0) return false
    return keywords.some((keyword) => matchesSearch(keyword))
  }

  // Comprehensive search function
  const getSearchResults = () => {
    if (!isSearching) {
      return {
        apps: [],
        actions: [],
        knowledgeBaseActions: [],
        triggers: [],
        coreActions: [],
        otherItems: [],
      }
    }

    const matchingApps: Array<{ name: string; icon: string }> = []
    const matchingActions: Array<{ appName: string; actionName: string; description: string; groupName: string }> = []
    const matchingTriggers: Array<{ appName: string; triggerName: string; description: string }> = []
    const matchingCoreActions: Array<{ name: string; icon: string; category: string; description: string }> = []
    const matchingOtherItems: Array<{ name: string; icon: string; category: string }> = []

    // First, collect all apps that match the search query
    const matchingAppNames = new Set<string>()
    
    // Search through all categories from nodes.json
    if (nodesData.categories) {
      nodesData.categories.forEach((category) => {
        category.items?.forEach((item) => {
          const itemName = item.name.toLowerCase()
          const itemKeywords = item.keywords || []
          
          // Check if app name or keywords match
          if (matchesSearch(item.name) || matchesKeywords(itemKeywords)) {
            if (category.name === "Apps") {
              // Check if app already exists in matchingApps
              if (!matchingApps.find((app) => app.name === item.name)) {
                matchingApps.push({
                  name: item.name,
                  icon: item.icon || "box",
                })
                matchingAppNames.add(item.name)
              }
            } else {
              // Other categories (Core Nodes, Logic, Utils, etc.)
              matchingOtherItems.push({
                name: item.name,
                icon: item.icon || "box",
                category: category.name,
              })
            }
          }
        })
      })
    }

    // Check if search query primarily matches an app name (exact or very close match)
    // If it does, we'll skip showing actions from matching apps (unless action itself matches)
    const isAppNameSearch = matchingAppNames.size > 0 && 
      Array.from(matchingAppNames).some(appName => {
        const appNameLower = appName.toLowerCase()
        // Check if search is an exact match or very close (app name starts with search or vice versa)
        return appNameLower === searchLower || 
               appNameLower.startsWith(searchLower) || 
               searchLower.startsWith(appNameLower)
      })

    // Search through appDetails for actions
    // If searching for an app name, skip actions from that app
    // Otherwise, show actions that match the search
    Object.entries(appDetails).forEach(([appName, details]) => {
      const appMatchedAsName = isAppNameSearch && matchingAppNames.has(appName)
      
      // If app matched as a name, skip all its actions/triggers
      if (appMatchedAsName) {
        return
      }

      // Search triggers
      details.triggers?.forEach((trigger) => {
        if (matchesSearch(trigger.name) || matchesSearch(trigger.description || "")) {
          matchingTriggers.push({
            appName,
            triggerName: trigger.name,
            description: trigger.description || "",
          })
          
          // Only add to matchingApps if it's actually an app (exists in allApps)
          const isActualApp = [...popularApps, ...otherApps].some((app) => app.name === appName)
          if (isActualApp && !matchingApps.find((app) => app.name === appName)) {
            const appItem = [...popularApps, ...otherApps].find((app) => app.name === appName)
            matchingApps.push({
              name: appName,
              icon: appItem?.icon || "box",
            })
          }
        }
      })

      // Search actions
      details.actionGroups?.forEach((group) => {
        group.items?.forEach((action) => {
          if (matchesSearch(action.name) || matchesSearch(action.description || "")) {
            matchingActions.push({
              appName,
              actionName: action.name,
              description: action.description || "",
              groupName: group.name,
            })
            
            // Only add to matchingApps if it's actually an app (exists in allApps)
            const isActualApp = [...popularApps, ...otherApps].some((app) => app.name === appName)
            if (isActualApp && !matchingApps.find((app) => app.name === appName)) {
              const appItem = [...popularApps, ...otherApps].find((app) => app.name === appName)
              matchingApps.push({
                name: appName,
                icon: appItem?.icon || "box",
              })
            }
          }
        })
      })
    })

    // Search through StackAI tools (core actions)
    if (nodesData.stackAITools) {
      Object.entries(nodesData.stackAITools).forEach(([categoryName, tools]) => {
        if (Array.isArray(tools)) {
          tools.forEach((tool: any) => {
            if (matchesSearch(tool.name) || matchesKeywords(tool.keywords || [])) {
              matchingCoreActions.push({
                name: tool.name,
                icon: tool.icon || "box",
                category: categoryName,
                description: tool.description || "",
              })
            }
          })
        }
      })
    }

    // Search through input items
    if (nodesData.inputItems) {
      nodesData.inputItems.forEach((item: any) => {
        if (matchesSearch(item.name) || matchesKeywords(item.keywords || [])) {
          matchingOtherItems.push({
            name: item.name,
            icon: item.icon || "box",
            category: "Inputs",
          })
        }
      })
    }

    // Search through output items
    if (nodesData.outputItems) {
      nodesData.outputItems.forEach((item: any) => {
        if (matchesSearch(item.name) || matchesKeywords(item.keywords || [])) {
          matchingOtherItems.push({
            name: item.name,
            icon: item.icon || "box",
            category: "Outputs",
          })
        }
      })
    }

    // Search through built-in triggers
    if (nodesData.builtInTriggers) {
      nodesData.builtInTriggers.forEach((trigger: any) => {
        if (matchesSearch(trigger.name) || matchesKeywords(trigger.keywords || [])) {
          matchingTriggers.push({
            appName: "Built-in",
            triggerName: trigger.name,
            description: "",
          })
        }
      })
    }

    // Search through app triggers
    // Skip app triggers that match app names when doing an app name search
    if (nodesData.appTriggers) {
      nodesData.appTriggers.forEach((trigger: any) => {
        // Skip if this trigger name matches an app name and we're doing an app name search
        if (isAppNameSearch && matchingAppNames.has(trigger.name)) {
          return
        }
        
        if (matchesSearch(trigger.name) || matchesKeywords(trigger.keywords || [])) {
          matchingTriggers.push({
            appName: trigger.name,
            triggerName: trigger.name,
            description: "",
          })
        }
      })
    }

    // Search through popular tools
    if (nodesData.popularTools) {
      nodesData.popularTools.forEach((tool: any) => {
        if (matchesSearch(tool.name) || matchesKeywords(tool.keywords || [])) {
          matchingOtherItems.push({
            name: tool.name,
            icon: tool.icon || "box",
            category: tool.category || "Popular",
          })
        }
      })
    }

    // Deduplicate otherItems by name and category
    const uniqueOtherItems = matchingOtherItems.filter((item, index, self) =>
      index === self.findIndex((t) => t.name === item.name && t.category === item.category)
    )

    // Sort otherItems by relevance score
    const sortedOtherItems = [...uniqueOtherItems].sort((a, b) => {
      // Get keywords from nodes.json for better scoring
      let aKeywords: string[] = []
      let bKeywords: string[] = []
      
      // Find keywords from nodes.json
      if (nodesData.categories) {
        nodesData.categories.forEach(category => {
          category.items?.forEach(item => {
            if (item.name === a.name) aKeywords = item.keywords || []
            if (item.name === b.name) bKeywords = item.keywords || []
          })
        })
      }
      
      // Also check popularTools
      if (nodesData.popularTools) {
        nodesData.popularTools.forEach((tool: any) => {
          if (tool.name === a.name) aKeywords = tool.keywords || []
          if (tool.name === b.name) bKeywords = tool.keywords || []
        })
      }
      
      const aScore = getRelevanceScore(a.name, aKeywords)
      const bScore = getRelevanceScore(b.name, bKeywords)
      
      // Higher score comes first
      return bScore - aScore
    })

    // Don't deduplicate actions - show both core actions and app actions even if they have the same name
    // They're from different sources (StackAI vs apps like Gmail/Outlook)
    const uniqueActions = matchingActions

    // Separate Knowledge Base actions from other app actions
    const knowledgeBaseActions = uniqueActions.filter(action => action.appName === "Knowledge Base")
    const regularAppActions = uniqueActions.filter(action => action.appName !== "Knowledge Base")

    // Sort apps by relevance score
    const sortedApps = [...matchingApps].sort((a, b) => {
      // Get keywords from nodes.json for better scoring
      let aKeywords: string[] = []
      let bKeywords: string[] = []
      
      // Find keywords from nodes.json
      if (nodesData.categories) {
        nodesData.categories.forEach(category => {
          if (category.name === "Apps") {
            category.items?.forEach(item => {
              if (item.name === a.name) aKeywords = item.keywords || []
              if (item.name === b.name) bKeywords = item.keywords || []
            })
          }
        })
      }
      
      const aScore = getRelevanceScore(a.name, aKeywords)
      const bScore = getRelevanceScore(b.name, bKeywords)
      
      // Higher score comes first
      return bScore - aScore
    })

    return {
      apps: sortedApps,
      actions: regularAppActions,
      knowledgeBaseActions: knowledgeBaseActions,
      triggers: matchingTriggers,
      coreActions: matchingCoreActions,
      otherItems: sortedOtherItems,
    }
  }

  const searchResults = getSearchResults()

  const filteredCategories = isSearching
    ? categories.filter((cat) => cat.name === activeTab)
    : categories.filter((cat) => cat.name === activeTab)

  return (
    <TooltipProvider delayDuration={0} skipDelayDuration={0}>
      <div className={`bg-card rounded-xl border border-border shadow-lg flex overflow-hidden group ${
        source === "sidebar" ? "w-[320px] h-[584px]" : "w-[420px] h-[312px]"
      }`}>
        {/* Sidebar with category tabs */}
        <div className="w-12 border-border/30 flex flex-col items-center py-2 flex-shrink-0 leading-3 h-auto border-r gap-0.5 relative">
          <div
            className="absolute left-1.5 w-9 h-9 bg-accent rounded-lg transition-transform duration-300 ease-out"
            style={{
              transform: `translateY(${getTabIndex() * 38}px)`,
            }}
          />

          {/* Popular Tab */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => {
                  setActiveTab("Popular")
                  setSearchQuery("")
                  setSelectedApp(null) // Clear selected app when changing tabs
                  setTabKey((prev) => prev + 1)
                }}
                className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors duration-200 cursor-pointer relative z-10 ${
                  activeTab === "Popular"
                    ? "text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                }`}
              >
                <Home className={`w-4 h-4 ${activeTab === "Popular" ? "fill-current" : ""}`} />
              </button>
            </TooltipTrigger>
            <TooltipContent
              side={source === "sidebar" ? "right" : "left"}
              align="center"
              sideOffset={0}
              avoidCollisions={false}
              className="bg-white text-foreground border border-border/50 shadow-md px-2 py-1.5 rounded-lg pointer-events-none"
              arrowClassName="bg-white fill-white border-border/50"
              onPointerEnter={(e) => e.preventDefault()}
            >
              <span className="text-sm font-medium">Popular</span>
            </TooltipContent>
          </Tooltip>

          {categoryTabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.key
            const hasSearchMatch = isSearching && (
              (tab.key === "Apps" && searchResults.apps.length > 0) ||
              (tab.key === "Core Nodes" && searchResults.coreActions.length > 0) ||
              (tab.key === "Triggers" && searchResults.triggers.length > 0) ||
              (tab.key === "Utils" && searchResults.otherItems.some(item => item.category === "Logic" || item.category === "Utils"))
            )

            return (
              <Tooltip key={tab.key}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => {
                      setActiveTab(tab.key)
                      setSearchQuery("")
                      setSelectedApp(null) // Clear selected app when changing tabs
                      if (!selectedApp) {
                        setTabKey((prev) => prev + 1)
                      }
                    }}
                    className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors duration-200 cursor-pointer relative z-10 ${
                      isActive
                        ? "text-accent-foreground"
                        : hasSearchMatch
                          ? "text-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? "fill-current" : ""}`} />
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  side={source === "sidebar" ? "right" : "left"}
                  align="center"
                  sideOffset={0}
                  avoidCollisions={false}
                  className="bg-white text-foreground border border-border/50 shadow-md px-2 py-1.5 rounded-lg pointer-events-none"
                  arrowClassName="bg-white fill-white border-border/50"
                  onPointerEnter={(e) => e.preventDefault()}
                >
                  <span className="text-sm font-medium">{tab.name}</span>
                </TooltipContent>
              </Tooltip>
            )
          })}
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden">
          {/* Header with search */}
          <div className="sticky top-0 z-10 bg-background border-b border-border/30 flex-shrink-0">
            <div className="flex items-center gap-2 px-3 py-2.5">
              {/* Back button - only show when in sublevel */}
              {selectedApp && (
                <button
                  onClick={() => setSelectedApp(null)}
                  className="flex items-center justify-center w-8 h-8 rounded-lg border border-border bg-white hover:bg-muted/50 transition-colors flex-shrink-0"
                >
                  <ChevronDown className="w-4 h-4 rotate-90 text-muted-foreground" />
                </button>
              )}
              <div className={`relative ${source === "sidebar" ? "flex-1" : "flex-1"}`}>
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search nodes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                  className={`w-full ${searchQuery ? "pl-9 pr-8" : source === "sidebar" ? "pl-9 pr-8" : "pl-9 pr-12"} py-1 text-sm bg-muted/50 rounded-lg border border-border focus:outline-none focus:ring-1 focus:ring-ring`}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-muted transition-colors group"
                  >
                    <X className="w-3.5 h-3.5 group-hover:text-foreground transition-colors animate-in spin-in-180 duration-200 text-ring" />
                  </button>
                )}
                {/* Command icon K - only show when not in sidebar */}
                {source !== "sidebar" && !searchQuery && (
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                    <Kbd className="h-5 px-1.5 text-xs flex items-center gap-0.5">
                      <span>⌘</span>
                      <span>K</span>
                    </Kbd>
                  </div>
                )}
              </div>
              {/* Pin button - only show for sidebar source */}
              {source === "sidebar" && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onPinToggle?.(!isPinned)
                      }}
                      className={`w-8 h-8 flex items-center justify-center rounded-md transition-all ${
                        isPinned
                          ? "bg-accent text-accent-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                      }`}
                    >
                      {isPinned ? (
                        <Pin className="w-3.5 h-3.5" />
                      ) : (
                        <PinOff className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent
                    side="bottom"
                    align="end"
                    sideOffset={4}
                    avoidCollisions={false}
                    className="bg-white text-foreground border border-border/50 shadow-md px-2 py-1.5 rounded-lg"
                    arrowClassName="bg-white fill-white border-border/50"
                  >
                    <span className="text-sm font-medium">{isPinned ? "Unpin" : "Pin"}</span>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>

          {/* Items list */}
          <div
            ref={scrollContainerRef}
            className={`flex-1 overflow-y-auto nowheel my-2 py-[0] node-selector-scrollable min-w-0 ${source === "sidebar" ? "node-selector-scrollable-thin" : ""}`}
            onWheel={(e) => e.stopPropagation()}
          >
            <div key={tabKey} className="animate-in fade-in duration-300">
              {selectedApp ? (
                renderAppDetailView(selectedApp)
              ) : activeTab === "Popular" && !isSearching ? (
                renderHomeView()
              ) : activeTab === "Core Nodes" && !isSearching ? (
                renderCoreView()
              ) : activeTab === "Triggers" && !isSearching ? (
                renderTriggersView()
              ) : activeTab === "Inputs and Outputs" && !isSearching ? (
                renderInputsAndOutputsView()
              ) : isSearching ? (
                <>
                  {/* Core Actions Section */}
                  {searchResults.coreActions.length > 0 && (
                    <div className="mb-4">
                      <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Core Actions
                      </div>
                      {searchResults.coreActions.map((action) => {
                        const uniqueKey = `core-action-${action.name}`
                        const actionData: SelectedAction = {
                          appName: "StackAI",
                          actionName: action.name,
                          description: action.description,
                          type: "action",
                        }

                        if (source === "sidebar") {
                          return (
                            <DraggableItem key={uniqueKey} data={actionData} className="group/item">
                              <div className="flex items-center justify-between py-1.5 pl-3 pr-3 text-sm cursor-grab hover:bg-accent/50 transition-colors min-w-0 overflow-hidden">
                                <div className="flex items-center gap-2 text-foreground min-w-0 flex-1 overflow-hidden">
                                  <div className="flex-shrink-0">
                                    <ItemIcon type={action.icon} />
                                  </div>
                              <span className="text-sm font-medium truncate min-w-0">{action.name}</span>
                                </div>
                                <GripVertical className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 opacity-0 group-hover/item:opacity-100 transition-all pointer-events-none ml-1" />
                              </div>
                            </DraggableItem>
                          )
                        }

                        return (
                          <DraggableItem
                            key={uniqueKey}
                            data={actionData}
                            onClick={() => handleActionClick("StackAI", { name: action.name, description: action.description })}
                            className="group/item"
                          >
                            <div className={`flex items-center gap-2.5 py-1 px-2 rounded-md text-sm cursor-pointer hover:bg-accent/50 transition-colors ${
                              selectedAction === action.name ? "bg-accent/40" : ""
                            }`}>
                              <ItemIcon type={action.icon} />
                              <span className="text-foreground truncate font-medium">{action.name}</span>
                            </div>
                          </DraggableItem>
                        )
                      })}
                    </div>
                  )}

                  {/* Nodes Section (Logic, Utils, Inputs, Outputs) - Show before Apps for better relevance */}
                  {searchResults.otherItems.length > 0 && (
                    <div className="mb-4">
                      <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Nodes
                      </div>
                      {searchResults.otherItems.map((item, index) => {
                        const uniqueKey = `other-${item.category}-${item.name}-${index}`
                        const actionData: SelectedAction = {
                          appName: item.name,
                          actionName: item.name,
                          description: nodeDescriptions[item.name] || `${item.name}`,
                          type: "action",
                        }

                        if (source === "sidebar") {
                          return (
                            <DraggableItem key={uniqueKey} data={actionData} className="group/item">
                              <div className="flex items-center justify-between py-1.5 pl-3 pr-3 text-sm cursor-grab hover:bg-accent/50 transition-colors min-w-0 overflow-hidden">
                                <div className="flex items-center gap-2 text-foreground min-w-0 flex-1 overflow-hidden">
                                  <div className="flex-shrink-0">
                                    <ItemIcon type={item.icon} />
                                  </div>
                                  <span className="text-sm font-medium truncate min-w-0">{item.name}</span>
                                </div>
                                <GripVertical className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 opacity-0 group-hover/item:opacity-100 transition-all pointer-events-none ml-1" />
                              </div>
                            </DraggableItem>
                          )
                        }

                        return (
                          <DraggableItem
                            key={uniqueKey}
                            data={actionData}
                            onClick={() => {
                              const actionData: SelectedAction = {
                                appName: item.name,
                                actionName: item.name,
                                description: nodeDescriptions[item.name] || `${item.name}`,
                                type: "action",
                              }
                              onSelectAction?.(actionData)
                            }}
                            className="group/item"
                          >
                            <div className={`flex items-center gap-2.5 py-1 px-2 rounded-md text-sm cursor-pointer hover:bg-accent/50 transition-colors ${
                              selectedAction === item.name ? "bg-accent/40" : ""
                            }`}>
                              <ItemIcon type={item.icon} />
                              <span className="text-foreground truncate font-medium">{item.name}</span>
                            </div>
                          </DraggableItem>
                        )
                      })}
                    </div>
                  )}

                  {/* Apps Section */}
                  {searchResults.apps.length > 0 && (
                    <div className="mb-4">
                      <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Apps
                      </div>
                      {searchResults.apps.map((app) => {
                        const uniqueKey = `search-app-${app.name}`
                        const details = appDetails[app.name]
                        const actionData: SelectedAction = {
                          appName: app.name,
                          actionName: app.name,
                          description: nodeDescriptions[app.name] || `${app.name} app`,
                          type: "action",
                        }

                        if (source === "sidebar") {
                          return (
                            <DraggableItem key={uniqueKey} data={actionData} className="group/item">
                              <div className="flex items-center justify-between py-1.5 pl-3 pr-3 text-sm cursor-grab hover:bg-accent/50 transition-colors min-w-0 overflow-hidden">
                                <div className="flex items-center gap-2 text-foreground min-w-0 flex-1 overflow-hidden">
                                  <div className="flex-shrink-0">
                                    <ItemIcon type={app.icon} appName={app.name} />
                                  </div>
                                  <span className="text-sm font-medium truncate min-w-0">{app.name}</span>
                                </div>
                                <GripVertical className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 opacity-0 group-hover/item:opacity-100 transition-all pointer-events-none ml-1" />
                              </div>
                            </DraggableItem>
                          )
                        }

                        return (
                          <div key={uniqueKey} className="group/item">
                            <div
                              onClick={() => handleItemClick("Apps", { name: app.name, icon: app.icon })}
                              className={`flex items-center justify-between py-1.5 px-2 rounded-md text-sm cursor-pointer hover:bg-accent/50 transition-colors ${
                                selectedAction === app.name && !details ? "bg-accent/40" : ""
                              }`}
                            >
                              <div className="flex items-center gap-2.5 text-foreground overflow-x-auto whitespace-nowrap">
                                <ItemIcon type={app.icon} appName={app.name} />
                                <span className="text-sm font-medium">{app.name}</span>
                              </div>
                              {details && (
                                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground -rotate-90 flex-shrink-0 opacity-0 group-hover/item:opacity-100 transition-opacity pointer-events-none" />
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Knowledge Base Actions Section - Show before regular app actions */}
                  {searchResults.knowledgeBaseActions && searchResults.knowledgeBaseActions.length > 0 && (
                    <div className="mb-4">
                      <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Knowledge Base
                      </div>
                      <div className="space-y-0.5 px-2 pl-6">
                        {searchResults.knowledgeBaseActions?.map((action) => {
                          const uniqueKey = `kb-action-${action.appName}-${action.actionName}`
                          const actionData: SelectedAction = {
                            appName: action.appName,
                            actionName: action.actionName,
                            description: action.description,
                            type: "action",
                          }

                          if (source === "sidebar") {
                            return (
                              <DraggableItem key={uniqueKey} data={actionData} className="group/item">
                                <div className="flex items-center justify-between py-1.5 pl-3 pr-3 text-sm cursor-grab hover:bg-accent/50 transition-colors min-w-0 overflow-hidden">
                                  <div className="flex items-center gap-2 text-foreground min-w-0 flex-1 overflow-hidden">
                                    <div className="flex-shrink-0">
                                      <ItemIcon type="book" />
                                    </div>
                                    <span className="text-sm font-medium truncate min-w-0">{action.actionName}</span>
                                  </div>
                                  <GripVertical className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 opacity-0 group-hover/item:opacity-100 transition-all pointer-events-none ml-1" />
                                </div>
                              </DraggableItem>
                            )
                          }

                          return (
                            <DraggableItem
                              key={uniqueKey}
                              data={actionData}
                              onClick={() => handleActionClick(action.appName, { name: action.actionName, description: action.description })}
                              className="group/item"
                            >
                              <div className={`flex items-center gap-2.5 py-1 px-2 rounded-md text-sm cursor-pointer hover:bg-accent/50 transition-colors ${
                                selectedAction === action.actionName ? "bg-accent/40" : ""
                              }`}>
                                <ItemIcon type="book" />
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="text-foreground truncate font-medium">{action.actionName}</span>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{action.actionName}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                            </DraggableItem>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Triggers Section */}
                  {searchResults.triggers.length > 0 && (
                    <div className="mb-4">
                      <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Triggers
                      </div>
                      {Object.entries(
                        searchResults.triggers.reduce((acc, trigger) => {
                          if (!acc[trigger.appName]) {
                            acc[trigger.appName] = []
                          }
                          acc[trigger.appName].push(trigger)
                          return acc
                        }, {} as Record<string, Array<{ appName: string; triggerName: string; description: string }>>)
                      ).map(([appName, triggers]) => {
                        const appItem = [...popularApps, ...otherApps].find((app) => app.name === appName)
                        return (
                          <div key={`triggers-${appName}`} className="mb-3">
                            <div className="px-3 py-1 flex items-center gap-2 text-sm font-light text-muted-foreground">
                              <ItemIcon type={appItem?.icon || "box"} appName={appName} />
                              <span className="lowercase">{appName}</span>
                            </div>
                            <div className="space-y-0.5 px-2 pl-6">
                              {triggers.map((trigger) => {
                                const uniqueKey = `trigger-${appName}-${trigger.triggerName}`
                                const triggerData: SelectedAction = {
                                  appName: appName,
                                  actionName: trigger.triggerName,
                                  description: trigger.description,
                                  type: "trigger",
                                }

                                if (source === "sidebar") {
                                  return (
                                    <DraggableItem key={uniqueKey} data={triggerData} className="group/item">
                                      <div className="flex items-center justify-between py-1.5 pl-3 pr-3 text-sm cursor-grab hover:bg-accent/50 transition-colors min-w-0 overflow-hidden">
                                        <div className="flex items-center gap-2 text-foreground min-w-0 flex-1 overflow-hidden">
                                          <div className="flex-shrink-0">
                                            <ItemIcon type={appItem?.icon || "box"} appName={appName} />
                                          </div>
                                          <span className="text-sm font-medium truncate min-w-0">{trigger.triggerName}</span>
                                        </div>
                                        <GripVertical className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 opacity-0 group-hover/item:opacity-100 transition-all pointer-events-none ml-1" />
                                      </div>
                                    </DraggableItem>
                                  )
                                }

                                return (
                                  <DraggableItem
                                    key={uniqueKey}
                                    data={triggerData}
                                    onClick={() => handleTriggerClick(appName, { name: trigger.triggerName, description: trigger.description })}
                                    className="group/item"
                                  >
                                    <div className={`flex items-center gap-2.5 py-1 px-2 rounded-md text-sm cursor-pointer hover:bg-accent/50 transition-colors ${
                                      selectedAction === trigger.triggerName ? "bg-accent/40" : ""
                                    }`}>
                                      <ItemIcon type={appItem?.icon || "box"} appName={appName} />
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <span className="text-foreground truncate font-medium">{trigger.triggerName}</span>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>{trigger.triggerName}</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </div>
                                  </DraggableItem>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Actions by App Section */}
                  {searchResults.actions.length > 0 && (
                    <div className="mb-4">
                      <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Actions
                      </div>
                      {Object.entries(
                        searchResults.actions.reduce((acc, action) => {
                          if (!acc[action.appName]) {
                            acc[action.appName] = []
                          }
                          acc[action.appName].push(action)
                          return acc
                        }, {} as Record<string, Array<{ appName: string; actionName: string; description: string; groupName: string }>>)
                      ).map(([appName, actions]) => {
                        const appItem = [...popularApps, ...otherApps].find((app) => app.name === appName)
                        return (
                          <div key={`actions-${appName}`} className="mb-3">
                            <div className="px-3 py-1 flex items-center gap-2 text-sm font-light text-muted-foreground">
                              <ItemIcon type={appItem?.icon || "box"} appName={appName} />
                              <span className="lowercase">{appName}</span>
                            </div>
                            <div className="space-y-0.5 px-2 pl-6">
                              {actions.map((action) => {
                                const uniqueKey = `action-${appName}-${action.actionName}`
                                const actionData: SelectedAction = {
                                  appName: appName,
                                  actionName: action.actionName,
                                  description: action.description,
                                  type: "action",
                                }

                                if (source === "sidebar") {
                                  return (
                                    <DraggableItem key={uniqueKey} data={actionData} className="group/item">
                                      <div className="flex items-center justify-between py-1.5 pl-3 pr-3 text-sm cursor-grab hover:bg-accent/50 transition-colors min-w-0 overflow-hidden">
                                        <div className="flex items-center gap-2 text-foreground min-w-0 flex-1 overflow-hidden">
                                          <div className="flex-shrink-0">
                                            <ItemIcon type={appItem?.icon || "box"} appName={appName} />
                                          </div>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <span className="text-sm font-medium truncate min-w-0">{action.actionName}</span>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                              <p>{action.actionName}</p>
                                            </TooltipContent>
                                          </Tooltip>
                                        </div>
                                        <GripVertical className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 opacity-0 group-hover/item:opacity-100 transition-all pointer-events-none ml-1" />
                                      </div>
                                    </DraggableItem>
                                  )
                                }

                                return (
                                  <DraggableItem
                                    key={uniqueKey}
                                    data={actionData}
                                    onClick={() => handleActionClick(appName, { name: action.actionName, description: action.description })}
                                    className="group/item"
                                  >
                                    <div className={`flex items-center gap-2.5 py-1 px-2 rounded-md text-sm cursor-pointer hover:bg-accent/50 transition-colors ${
                                      selectedAction === action.actionName ? "bg-accent/40" : ""
                                    }`}>
                                      <ItemIcon type={appItem?.icon || "box"} appName={appName} />
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <span className="text-foreground truncate font-medium">{action.actionName}</span>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>{action.actionName}</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </div>
                                  </DraggableItem>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* No results message */}
                  {searchResults.apps.length === 0 && 
                   searchResults.actions.length === 0 && 
                   (searchResults.knowledgeBaseActions?.length || 0) === 0 &&
                   searchResults.triggers.length === 0 && 
                   searchResults.coreActions.length === 0 && 
                   searchResults.otherItems.length === 0 && (
                    <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                      No results found for "{searchQuery}"
                    </div>
                  )}
                </>
              ) : (
                <>
                  {filteredCategories.map((category) => (
                    <div key={category.name}>
                      {category.name === "Apps" ? (
                        <>
                          {isSearching ? (
                            // When searching, show all matching apps
                            category.items.map((item) => {
                              const uniqueKey = `search-${item.name}`
                            const details = appDetails[item.name]
                            const actionData: SelectedAction = {
                              appName: item.name,
                              actionName: item.name,
                              description: nodeDescriptions[item.name] || `${item.name} app`,
                              type: "action",
                            }

                            if (source === "sidebar") {
                              return (
                                <DraggableItem
                                  key={uniqueKey}
                                  data={actionData}
                                  className="group/item"
                                >
                                  <div className="flex items-center justify-between py-1.5 pl-3 pr-3 text-sm cursor-grab hover:bg-accent/50 transition-colors min-w-0 overflow-hidden">
                                    <div className="flex items-center gap-2 text-foreground min-w-0 flex-1 overflow-hidden">
                                      <div className="flex-shrink-0">
                                        <ItemIcon type={item.icon} />
                                      </div>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <span className="text-sm font-medium truncate min-w-0">{item.name}</span>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>{item.name}</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </div>
                                    <GripVertical className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 opacity-0 group-hover/item:opacity-100 transition-all pointer-events-none ml-1" />
                                  </div>
                                </DraggableItem>
                              )
                            }

                            return (
                              <div key={uniqueKey} className="group/item">
                                <div
                                  onClick={() => handleItemClick(category.name, item)}
                                  className={`flex items-center justify-between py-1.5 px-2 rounded-md text-sm cursor-pointer hover:bg-accent/50 transition-colors ${
                                    selectedAction === item.name && !details ? "bg-accent/40" : ""
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5 text-foreground overflow-x-auto whitespace-nowrap">
                                    <ItemIcon type={item.icon} />
                                    <span className="text-sm font-medium">{item.name}</span>
                                  </div>
                                  {details && (
                                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground -rotate-90 flex-shrink-0 opacity-0 group-hover/item:opacity-100 transition-opacity pointer-events-none" />
                                  )}
                                </div>
                              </div>
                            )
                          })
                          ) : (
                            <>
                              {/* Popular apps section */}
                              <div className="sticky top-0 z-10 bg-background py-1.5 my-0">
                                <div className="px-3 font-light text-muted-foreground text-sm lowercase">
                                  Most used apps
                                </div>
                              </div>
                              {popularApps.map((item) => {
                                const uniqueKey = `popular-${item.name}`
                                const details = appDetails[item.name]
                                const actionData: SelectedAction = {
                                  appName: item.name,
                                  actionName: item.name,
                                  description: nodeDescriptions[item.name] || `${item.name} app`,
                                  type: "action",
                                }

                                if (source === "sidebar") {
                                  return (
                                    <DraggableItem
                                      key={uniqueKey}
                                      data={actionData}
                                      className="group/item"
                                    >
                                      <div className="flex items-center justify-between py-1.5 pl-3 pr-3 text-sm cursor-grab hover:bg-accent/50 transition-colors min-w-0 overflow-hidden">
                                        <div className="flex items-center gap-2 text-foreground min-w-0 flex-1 overflow-hidden">
                                          <div className="flex-shrink-0">
                                            <ItemIcon type={item.icon} />
                                          </div>
                                          <span className="text-sm font-medium truncate min-w-0">{item.name}</span>
                                        </div>
                                        <GripVertical className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 opacity-0 group-hover/item:opacity-100 transition-all pointer-events-none ml-1" />
                                      </div>
                                    </DraggableItem>
                                  )
                                }

                                return (
                                  <div key={uniqueKey} className="group/item">
                                    <div
                                      onClick={() => handleItemClick(category.name, item)}
                                      className={`flex items-center justify-between py-2 px-4 rounded-md text-sm cursor-pointer hover:bg-accent/50 transition-colors ${
                                        selectedAction === item.name && !details ? "bg-accent/40" : ""
                                      }`}
                                    >
                                      <div className="flex items-center gap-2.5 text-foreground overflow-x-auto whitespace-nowrap">
                                        <ItemIcon type={item.icon} appName={item.name} />
                                        <span className="text-sm font-medium">{item.name}</span>
                                      </div>
                                      {details && (
                                        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground -rotate-90 flex-shrink-0 opacity-0 group-hover/item:opacity-100 transition-opacity pointer-events-none" />
                                      )}
                                    </div>
                                  </div>
                                )
                              })}
                              
                              {/* Other apps section */}
                              <div className="sticky top-0 z-10 bg-background py-1.5 my-0 mt-2">
                                <div className="px-3 font-light text-muted-foreground text-sm lowercase">
                                  Other apps
                                </div>
                              </div>
                              {otherApps.map((item) => {
                                const uniqueKey = `other-${item.name}`
                                const details = appDetails[item.name]
                                const actionData: SelectedAction = {
                                  appName: item.name,
                                  actionName: item.name,
                                  description: nodeDescriptions[item.name] || `${item.name} app`,
                                  type: "action",
                                }

                                if (source === "sidebar") {
                                  return (
                                    <DraggableItem
                                      key={uniqueKey}
                                      data={actionData}
                                      className="group/item"
                                    >
                                      <div className="flex items-center justify-between py-1.5 pl-3 pr-3 text-sm cursor-grab hover:bg-accent/50 transition-colors min-w-0 overflow-hidden">
                                        <div className="flex items-center gap-2 text-foreground min-w-0 flex-1 overflow-hidden">
                                          <div className="flex-shrink-0">
                                            <ItemIcon type={item.icon} appName={item.name} />
                                          </div>
                                          <span className="text-sm font-medium truncate min-w-0">{item.name}</span>
                                        </div>
                                        <GripVertical className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 opacity-0 group-hover/item:opacity-100 transition-all pointer-events-none ml-1" />
                                      </div>
                                    </DraggableItem>
                                  )
                                }

                                return (
                                  <div key={uniqueKey} className="group/item">
                                    <div
                                      onClick={() => handleItemClick(category.name, item)}
                                      className={`flex items-center justify-between py-2 px-4 rounded-md text-sm cursor-pointer hover:bg-accent/50 transition-colors ${
                                        selectedAction === item.name && !details ? "bg-accent/40" : ""
                                      }`}
                                    >
                                      <div className="flex items-center gap-2.5 text-foreground overflow-x-auto whitespace-nowrap">
                                        <ItemIcon type={item.icon} appName={item.name} />
                                        <span className="text-sm font-medium">{item.name}</span>
                                      </div>
                                      {details && (
                                        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground -rotate-90 flex-shrink-0 opacity-0 group-hover/item:opacity-100 transition-opacity pointer-events-none" />
                                      )}
                                    </div>
                                  </div>
                                )
                              })}
                            </>
                          )}
                        </>
                      ) : (
                        <>
                          {/* Category header (always shown, except for Utils) */}
                          {category.name !== "Utils" && (
                            <div className="px-3 font-light text-muted-foreground text-sm py-1.5 my-0 lowercase">
                              {category.name}
                            </div>
                          )}

                          {/* For Utils category, show Logic section first, then Utils section */}
                          {category.name === "Utils" ? (
                            <>
                              {/* Logic section */}
                              <div className="sticky top-0 z-10 bg-background py-1 my-0">
                                <div className="px-3 font-light text-muted-foreground text-xs uppercase tracking-wider">
                                  Logic
                                </div>
                              </div>
                              {category.items.slice(0, 4).map((item) => {
                                const uniqueKey = `${category.name}-${item.name}`
                                const details = appDetails[item.name]
                                const actionData: SelectedAction = {
                                  appName: item.name,
                                  actionName: item.name,
                                  description: nodeDescriptions[item.name] || `${item.name} node`,
                                  type: "action",
                                }

                                if (source === "sidebar") {
                                  return (
                                    <DraggableItem
                                      key={uniqueKey}
                                      data={actionData}
                                      className="group/item"
                                    >
                                      <div className="flex items-center justify-between py-1.5 pl-3 pr-3 text-sm cursor-grab hover:bg-accent/50 transition-colors min-w-0 overflow-hidden">
                                        <div className="flex items-center gap-2 text-foreground min-w-0 flex-1 overflow-hidden">
                                          <div className="flex-shrink-0">
                                            <ItemIcon type={item.icon} />
                                          </div>
                                          <span className="text-sm font-medium truncate min-w-0">{item.name}</span>
                                        </div>
                                        <GripVertical className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 opacity-0 group-hover/item:opacity-100 transition-all pointer-events-none ml-1" />
                                      </div>
                                    </DraggableItem>
                                  )
                                }

                                return (
                                  <div key={uniqueKey} className="group/item">
                                    <div
                                      onClick={() => handleItemClick(category.name, item)}
                                      className={`flex items-center justify-between py-2 px-4 rounded-md text-sm cursor-pointer hover:bg-accent/50 transition-colors ${
                                        selectedAction === item.name && !details ? "bg-accent/40" : ""
                                      }`}
                                    >
                                      <div className="flex items-center gap-2.5 text-foreground overflow-x-auto whitespace-nowrap">
                                        <ItemIcon type={item.icon} appName={item.name} />
                                        <span className="text-sm font-medium">{item.name}</span>
                                      </div>
                                      {details && (
                                        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground -rotate-90 flex-shrink-0 opacity-0 group-hover/item:opacity-100 transition-opacity pointer-events-none" />
                                      )}
                                    </div>
                                  </div>
                                )
                              })}
                              
                              {/* Utils subcategories */}
                              {category.utilsCategories && Object.entries(category.utilsCategories).map(([subCategoryName, items]) => (
                                <div key={subCategoryName}>
                                  <div className="sticky top-0 z-10 bg-background py-1 my-0 mt-2">
                                    <div className="px-3 font-light text-muted-foreground text-xs uppercase tracking-wider">
                                      {subCategoryName}
                                    </div>
                                  </div>
                                  {items.map((item) => {
                                    const uniqueKey = `${category.name}-${subCategoryName}-${item.name}`
                                    const details = appDetails[item.name]
                                    const actionData: SelectedAction = {
                                      appName: item.name,
                                      actionName: item.name,
                                      description: nodeDescriptions[item.name] || `${item.name} node`,
                                      type: "action",
                                    }

                                    if (source === "sidebar") {
                                      return (
                                        <DraggableItem
                                          key={uniqueKey}
                                          data={actionData}
                                          className="group/item"
                                        >
                                          <div className="flex items-center justify-between py-1.5 pl-3 pr-3 text-sm cursor-grab hover:bg-accent/50 transition-colors min-w-0 overflow-hidden">
                                            <div className="flex items-center gap-2 text-foreground min-w-0 flex-1 overflow-hidden">
                                              <div className="flex-shrink-0">
                                                <ItemIcon type={item.icon} appName={item.name} />
                                              </div>
                                              <Tooltip>
                                                <TooltipTrigger asChild>
                                                  <span className="text-sm font-medium truncate min-w-0">{item.name}</span>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                  <p>{item.name}</p>
                                                </TooltipContent>
                                              </Tooltip>
                                            </div>
                                            <GripVertical className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 opacity-0 group-hover/item:opacity-100 transition-all pointer-events-none ml-1" />
                                          </div>
                                        </DraggableItem>
                                      )
                                    }

                                    return (
                                      <div key={uniqueKey} className="group/item">
                                        <div
                                          onClick={() => handleItemClick(category.name, item)}
                                          className={`flex items-center justify-between py-2 px-4 rounded-md text-sm cursor-pointer hover:bg-accent/50 transition-colors ${
                                            selectedAction === item.name && !details ? "bg-accent/40" : ""
                                          }`}
                                        >
                                          <div className="flex items-center gap-2.5 text-foreground overflow-x-auto whitespace-nowrap">
                                            <ItemIcon type={item.icon} appName={item.name} />
                                            <span className="text-sm font-medium">{item.name}</span>
                                          </div>
                                          {details && (
                                            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground -rotate-90 flex-shrink-0 opacity-0 group-hover/item:opacity-100 transition-opacity pointer-events-none" />
                                          )}
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              ))}
                            </>
                          ) : (
                            <>
                              {/* Category items for other categories */}
                              {category.items.map((item) => {
                        const uniqueKey = `${category.name}-${item.name}`
                        const details = appDetails[item.name]
                        const isExpanded = false
                        const actionData: SelectedAction = {
                          appName: item.name,
                          actionName: item.name,
                          description: nodeDescriptions[item.name] || `${item.name} node`,
                          type: "action",
                        }

                        if (source === "sidebar") {
                        return (
                            <DraggableItem
                              key={uniqueKey}
                              data={actionData}
                              className="group/item"
                            >
                              <div className="flex items-center justify-between py-1.5 pl-3 pr-3 text-sm cursor-grab hover:bg-accent/50 transition-colors min-w-0 overflow-hidden">
                                <div className="flex items-center gap-2 text-foreground min-w-0 flex-1 overflow-hidden">
                                  <div className="flex-shrink-0">
                                    <ItemIcon type={item.icon} />
                                  </div>
                                  <span className="text-sm font-medium truncate min-w-0">{item.name}</span>
                                </div>
                                <GripVertical className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 opacity-0 group-hover/item:opacity-100 transition-all pointer-events-none ml-1" />
                              </div>
                            </DraggableItem>
                          )
                        }

                        return (
                          <div key={uniqueKey} className="group/item">
                            {/* Item row */}
                            <div
                              onClick={() => handleItemClick(category.name, item)}
                              className={`flex items-center justify-between py-1.5 px-2 rounded-md text-sm cursor-pointer hover:bg-accent/50 transition-colors ${
                                selectedAction === item.name && !details ? "bg-accent/40" : ""
                              }`}
                            >
                              <div className="flex items-center gap-2.5 text-foreground overflow-x-auto whitespace-nowrap">
                                <ItemIcon type={item.icon} />
                                <span className="text-sm font-medium">{item.name}</span>
                              </div>
                              {details && (
                                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground -rotate-90 flex-shrink-0 opacity-0 group-hover/item:opacity-100 transition-opacity pointer-events-none" />
                              )}
                            </div>
                          </div>
                        )
                      })}
                              </>
                            )}
                        </>
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
