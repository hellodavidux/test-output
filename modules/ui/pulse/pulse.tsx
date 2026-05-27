import type { VariantProps } from 'class-variance-authority'

import { cva } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const pingVariants = cva('rounded-full', {
  variants: {
    variant: {
      error: 'bg-stackai-red-300',
      warning: 'bg-stackai-orange-300',
      info: 'bg-stackai-blue-500',
    },
  },
  defaultVariants: { variant: 'warning' },
})

const solidVariants = cva('rounded-full', {
  variants: {
    variant: {
      error: 'bg-stackai-red-500',
      warning: 'bg-stackai-orange-400',
      info: 'bg-stackai-blue-600',
    },
  },
  defaultVariants: { variant: 'warning' },
})

const PING_ANIMATION = 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite'

export interface PulseProps extends VariantProps<typeof pingVariants> {
  className?: string
}

export const Pulse = ({ variant, className }: PulseProps) => (
  <span
    aria-hidden="true"
    className={cn('relative inline-flex size-2.5', className)}
  >
    <span
      className={cn('absolute inset-0', pingVariants({ variant }))}
      style={{ animation: PING_ANIMATION }}
    />
    <span className={cn('size-full', solidVariants({ variant }))} />
  </span>
)
