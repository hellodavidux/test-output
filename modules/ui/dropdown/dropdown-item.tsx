import { cn } from '@/lib/utils'

const DROPDOWN_ITEM_SIZE = 'flex items-center min-h-8 px-2 py-1.5 text-sm font-normal leading-5'

export const DROPDOWN_ITEM_SELECTED_CLASSES =
  'data-[selected]:bg-stack-foreground/5 data-[selected]:hover:bg-stack-foreground/[0.08] data-[selected]:data-[highlighted]:bg-stack-foreground/[0.08]'

export const DROPDOWN_ITEM_CLASSES =
  `rounded-stack-md ${DROPDOWN_ITEM_SIZE} outline-none hover:bg-stack-foreground/[0.06] data-[highlighted]:bg-stack-foreground/[0.06] data-[disabled]:pointer-events-none data-[disabled]:opacity-50`

interface DropdownItemShapeProps extends React.ComponentPropsWithRef<'div'> {
  leading?: React.ReactNode
  trailing?: React.ReactNode
  children: React.ReactNode
}

const DropdownItemShape = ({ leading, trailing, children, className, ref, ...props }: DropdownItemShapeProps) => (
  <div
    ref={ref}
    className={cn('flex w-full items-center gap-1.5', className)}
    {...props}
  >
    {leading}
    <span className="min-w-0 flex-1 text-stack-foreground">{children}</span>
    {trailing && <span className="shrink-0">{trailing}</span>}
  </div>
)

export { DropdownItemShape }
