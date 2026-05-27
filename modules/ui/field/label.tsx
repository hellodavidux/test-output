'use client'

import type { TooltipWrapperProps } from '@/modules/ui/tooltip/tooltip-wrapper'

import { CircleHelp } from 'lucide-react'

import { cn } from '@/lib/utils'
import { ICON_SIZE } from '@/modules/ui/consts'
import { TooltipWrapper } from '@/modules/ui/tooltip/tooltip-wrapper'

export const LABEL_VARIANTS = {
  default: 'default',
  required: 'required',
  info: 'info',
} as const

export type LabelVariant = (typeof LABEL_VARIANTS)[keyof typeof LABEL_VARIANTS]

export interface LabelProps extends Omit<React.ComponentPropsWithoutRef<'label'>, 'style'> {
  variant?: LabelVariant
  compact?: boolean
  tooltip?: TooltipWrapperProps['content']
  tooltipSide?: TooltipWrapperProps['side']
  className?: string
  ref?: React.Ref<HTMLLabelElement>
}

const BASE_CLASSES = 'flex min-h-6 w-fit items-center gap-0.5 px-0.5 text-sm font-normal leading-5 text-stack-foreground'

const LabelInner = ({
  variant,
  children,
}: { variant: LabelVariant, children: React.ReactNode }) => (
  <span className={cn('inline-flex items-center', 'gap-1.5')}>
    {children}
    {variant === LABEL_VARIANTS.required && (
      <span className="text-stackai-red-500" aria-hidden="true">*</span>
    )}
    {variant === LABEL_VARIANTS.info && <CircleHelp className={cn(ICON_SIZE, 'text-stackai-black-500')} />}
  </span>
)

const Label = ({
  variant = 'default',
  compact,
  tooltip,
  tooltipSide,
  children,
  ref,
  className,
  ...props
}: LabelProps) => (
  <label
    ref={ref}
    className={cn(BASE_CLASSES, compact && 'min-h-0 w-auto', className)}
    {...props}
  >
    <TooltipWrapper
      content={tooltip}
      side={tooltipSide ?? 'right'}
    >
      <span className="inline-flex">
        <LabelInner variant={variant}>{children}</LabelInner>
      </span>
    </TooltipWrapper>
  </label>
)

export { Label }
