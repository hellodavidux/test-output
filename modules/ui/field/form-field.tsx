'use client'

import type { LabelVariant } from '@/modules/ui/field/label'
import type { FieldLabelAction, FieldStatus } from '@/modules/ui/field/types'
import type { TooltipWrapperProps } from '@/modules/ui/tooltip/tooltip-wrapper'

import { useId } from 'react'

import { cn } from '@/lib/utils'
import { Button } from '@/modules/ui/button/button'
import { FieldHint } from '@/modules/ui/field/field-hint'
import { Label } from '@/modules/ui/field/label'

export interface FormFieldRenderProps {
  id: string
  'aria-describedby'?: string
  'aria-invalid'?: boolean
}

export interface FormFieldProps {
  label: React.ReactNode
  labelVariant?: LabelVariant
  labelAction?: FieldLabelAction
  tooltip?: React.ReactNode
  tooltipSide?: TooltipWrapperProps['side']
  status?: FieldStatus
  hint?: React.ReactNode
  className?: string
  children: (props: FormFieldRenderProps) => React.ReactNode
}

const FormField = ({
  label,
  labelVariant,
  labelAction,
  tooltip,
  tooltipSide,
  status,
  hint,
  className,
  children,
}: FormFieldProps) => {
  const id = useId()
  const hintId = `${id}-hint`

  return (
    <div className={cn('flex w-full flex-col gap-1', className)}>
      {label && (
        <div className="flex w-full items-center justify-between">
          <Label
            htmlFor={id}
            variant={labelVariant}
            compact={!!labelAction}
            tooltip={tooltip}
            tooltipSide={tooltipSide}
          >
            {label}
          </Label>
          {labelAction && (
            <Button
              type="button"
              intent="ghost"
              size="xs"
              onClick={labelAction.onClick}
              disabled={labelAction.isDisabled}
              icon={labelAction.icon}
              iconPosition="right"
            >
              {labelAction.text}
            </Button>
          )}
        </div>
      )}
      {children({
        id,
        'aria-describedby': hint ? hintId : undefined,
        'aria-invalid': status === 'error' || undefined,
      })}
      {hint ? <FieldHint id={hintId} status={status}>{hint}</FieldHint> : null}
    </div>
  )
}

export { FormField }
