import type { IconComponent } from '@/modules/ui/icon/types'

import { cn } from '@/lib/utils'

interface DropdownIconSlotProps extends React.ComponentProps<'span'> {
  Icon: IconComponent
}

export const DropdownIconSlot = ({ Icon, className, ...props }: DropdownIconSlotProps) => (
  <span className={cn('flex size-4 shrink-0 items-center justify-center', className)} {...props}>
    <Icon className="size-4 shrink-0" strokeWidth={1.5} />
  </span>
)
