import type { VariantProps } from 'class-variance-authority'

import type { FieldStatus } from '@/modules/ui/field/types'
import type { IconComponent } from '@/modules/ui/icon/types'

import { cva } from 'class-variance-authority'
import { CircleCheck, Info, OctagonAlert, TriangleAlert } from 'lucide-react'

import { cn } from '@/lib/utils'
import { ICON_SIZE } from '@/modules/ui/consts'

const STATUS_ICONS: Record<FieldStatus, IconComponent | null> = {
  default: null,
  error: OctagonAlert,
  warning: TriangleAlert,
  success: CircleCheck,
  info: Info,
}

const fieldHintVariants = cva(
  `flex items-start ${'gap-1.5'} pt-0.5 text-xs font-normal leading-4`,
  {
    variants: {
      status: {
        default: 'text-stackai-black-500',
        error: 'text-stackai-red-500',
        warning: 'text-stackai-orange-500',
        success: 'text-stackai-green-500',
        info: 'text-stackai-blue-500',
      },
    },
    defaultVariants: {
      status: 'default',
    },
  },
)

export interface FieldHintProps
  extends Omit<React.ComponentPropsWithoutRef<'p'>, 'style'>,
  VariantProps<typeof fieldHintVariants> {
  hidden?: boolean
  ref?: React.Ref<HTMLParagraphElement>
  className?: string
}

const FieldHint = ({ id, status, hidden, children, ref, className, ...props }: FieldHintProps) => {
  const Icon = STATUS_ICONS[status ?? 'default']

  return (
    <p
      {...props}
      ref={ref}
      id={id}
      aria-live="polite"
      className={cn(fieldHintVariants({ status }), hidden && 'invisible', className)}
    >
      {Icon && (
        <span className="flex size-4 shrink-0 items-center justify-center" aria-hidden="true">
          <Icon className={ICON_SIZE} strokeWidth={1.5} />
        </span>
      )}
      <span className="min-w-0 flex-1">{children || ' '}</span>
    </p>
  )
}

export { FieldHint }
