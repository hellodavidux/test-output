/* eslint-disable react-refresh/only-export-components -- buttonVariants is co-located with the component intentionally */
import type { VariantProps } from 'class-variance-authority'

import type { PulseProps } from '@/modules/ui/pulse/pulse'
import type { TooltipWrapperProps } from '@/modules/ui/tooltip/tooltip-wrapper'

import { Button as BaseButton } from '@base-ui/react/button'
import { cva } from 'class-variance-authority'

import { cn } from '@/lib/utils'
import { Pulse } from '@/modules/ui/pulse/pulse'
import { TooltipWrapper } from '@/modules/ui/tooltip/tooltip-wrapper'

export const buttonVariants = cva(
  'relative inline-flex items-center justify-center gap-1.5 overflow-visible whitespace-nowrap transition-[color,background-color,box-shadow] focus-visible:outline-none focus-visible:shadow-stack-focus-ring disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      intent: {
        primary:
          'bg-stackai-black-900 text-stackai-black-50 hover:bg-stackai-black-900/90 shadow-stack-btn-primary dark:bg-stackai-black-50 dark:text-stackai-black-900 dark:hover:bg-stackai-black-50/90',
        secondary:
          'bg-stack-background text-stack-foreground hover:bg-stackai-black-100 dark:hover:bg-stackai-black-800',
        ghost:
          'text-stack-foreground hover:bg-stack-foreground/10',
        danger:
          'bg-stackai-red-500 text-white hover:bg-stackai-red-700 dark:bg-stackai-red-500 dark:hover:bg-stackai-red-600',
      },
    },
    defaultVariants: {
      intent: 'primary',
    },
  },
)

export type ButtonIntent = NonNullable<VariantProps<typeof buttonVariants>['intent']>

export interface ButtonPrimitiveProps
  extends Omit<BaseButton.Props, 'className'> {
  intent?: ButtonIntent | null
  tooltip?: TooltipWrapperProps['content']
  tooltipSide?: TooltipWrapperProps['side']
  pulse?: PulseProps['variant']
  isLoading?: boolean
  /** Opt into the elevation drop shadow on `secondary` intent. The hairline border is always on. No effect on other intents. */
  hasShadow?: boolean
  className?: string
}

const ButtonPrimitive = ({
  intent,
  isLoading = false,
  hasShadow = false,
  pulse,
  tooltip,
  tooltipSide,
  disabled,
  type = 'button',
  className,
  children,
  ref,
  ...props
}: ButtonPrimitiveProps) => {
  const isDisabled = disabled || isLoading

  const secondaryShadowClass = intent === 'secondary'
    ? hasShadow ? 'shadow-stack-btn-secondary' : 'shadow-stack-field'
    : undefined

  const button = (
    <BaseButton
      {...props}
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-busy={isLoading}
      className={cn(buttonVariants({ intent }), secondaryShadowClass, className)}
    >
      {pulse && <Pulse variant={pulse} className="absolute -right-[3px] -top-[3px]" />}
      {children}
    </BaseButton>
  )

  return (
    <TooltipWrapper content={tooltip} side={tooltipSide}>
      {button}
    </TooltipWrapper>
  )
}

ButtonPrimitive.displayName = 'ButtonPrimitive'

export { ButtonPrimitive }
