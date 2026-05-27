import { LoaderCircleIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

export const Spinner = ({ className = 'size-4' }: { className?: string } = {}) => (
  <LoaderCircleIcon className={cn('animate-spin', className)} aria-hidden="true" />
)
