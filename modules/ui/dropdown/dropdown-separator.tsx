import { cn } from '@/lib/utils'

interface DropdownSeparatorProps extends React.ComponentPropsWithRef<'div'> {}

const DropdownSeparator = ({ className, ref, ...props }: DropdownSeparatorProps) => (
  <div
    ref={ref}
    className={cn('mx-1 my-0.5 h-px bg-stack-foreground/[0.08]', className)}
    {...props}
  />
)

export { DropdownSeparator }
