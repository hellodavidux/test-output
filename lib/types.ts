import type React from "react"
// Shared types for the workflow builder

export type ActionItem = {
  name: string
  description: string
}

export type ActionGroup = {
  name: string
  items: ActionItem[]
}

export type AppDetail = {
  triggers: ActionItem[]
  actionGroups: ActionGroup[]
  tags?: string[]
}

export type CategoryItem = {
  name: string
  icon: string
}

export type Category = {
  name: string
  icon: React.ComponentType<{ className?: string }>
  items: CategoryItem[]
}

export type SelectedAction = {
  appName: string
  actionName: string
  description: string
  type: "trigger" | "action"
}

export type WorkflowNodeData = {
  appName: string
  actionName: string
  description: string
  type: "trigger" | "action"
  version?: string
  onReplaceNode?: () => void
  onHandleClick?: (side: "left" | "right", position: { x: number; y: number }) => void
  onDeleteNode?: (nodeId: string) => void
}
