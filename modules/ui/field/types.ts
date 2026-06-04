import type { LucideIcon } from 'lucide-react'

export const FIELD_STATUSES = {
  default: 'default',
  error: 'error',
  warning: 'warning',
  success: 'success',
  info: 'info',
} as const

export type FieldStatus = (typeof FIELD_STATUSES)[keyof typeof FIELD_STATUSES]

export const FIELD_STATUS_CLASSES: Record<FieldStatus, string> = {
  default: 'shadow-stack-field focus-within:shadow-stack-field-focus',
  error: 'shadow-stack-field-error focus-within:shadow-stack-field-error-focus',
  warning: 'shadow-stack-field-warning focus-within:shadow-stack-field-warning-focus',
  success: 'shadow-stack-field-success focus-within:shadow-stack-field-success-focus',
  info: 'shadow-stack-field-info focus-within:shadow-stack-field-info-focus',
}

export interface FieldLabelAction {
  text: string
  icon?: LucideIcon
  onClick: () => void
  isDisabled?: boolean
}
