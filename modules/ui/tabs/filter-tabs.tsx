import { useCallback } from 'react'

import { cn } from '@/lib/utils'
import { Button } from '@/modules/ui/button/button'

interface FilterTabOption<T extends string> {
  value: T
  label: string
}

interface FilterTabsProps<T extends string> {
  options: FilterTabOption<T>[]
  value: T
  defaultValue?: T
  onValueChange: (value: T) => void
  className?: string
}

const FilterTabs = <T extends string>({
  options,
  value,
  defaultValue,
  onValueChange,
  className,
}: FilterTabsProps<T>) => {
  const handleClick = useCallback((optionValue: T) => {
    if (optionValue === value && defaultValue !== undefined) {
      onValueChange(defaultValue)
    } else {
      onValueChange(optionValue)
    }
  }, [value, defaultValue, onValueChange])

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {options.map((option) => (
        <Button
          key={option.value}
          intent={value === option.value ? 'primary' : 'secondary'}
          onClick={() => handleClick(option.value)}
          size="sm"
        >
          {option.label}
        </Button>
      ))}
    </div>
  )
}

export { FilterTabs }
export type { FilterTabOption, FilterTabsProps }
