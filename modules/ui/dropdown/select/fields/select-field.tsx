'use client'

import type { SelectOption } from '@/modules/ui/dropdown/select/select/select'
import type { LabelVariant } from '@/modules/ui/field/label'
import type { FieldStatus } from '@/modules/ui/field/types'
import type { TooltipWrapperProps } from '@/modules/ui/tooltip/tooltip-wrapper'

import {
  Select,
  SelectContent,
  SelectTrigger,
} from '@/modules/ui/dropdown/select/select/select'
import { FormField } from '@/modules/ui/field/form-field'

export interface SelectFieldProps {
  label: React.ReactNode
  labelVariant?: LabelVariant
  tooltip?: React.ReactNode
  tooltipSide?: TooltipWrapperProps['side']
  status?: FieldStatus
  hint?: React.ReactNode
  className?: string
  value?: SelectOption | null
  defaultValue?: SelectOption | null
  onValueChange?: (option: SelectOption) => void
  placeholder?: string
  isDisabled?: boolean
  children: React.ReactNode
  ref?: React.Ref<HTMLButtonElement>
}

const SelectField = ({
  label,
  labelVariant,
  tooltip,
  tooltipSide,
  status,
  hint,
  className,
  value,
  defaultValue,
  onValueChange,
  placeholder,
  isDisabled,
  children,
  ref,
}: SelectFieldProps) => (
  <FormField
    label={label}
    labelVariant={labelVariant}
    tooltip={tooltip}
    tooltipSide={tooltipSide}
    status={status}
    hint={hint}
    className={className}
  >
    {(fieldProps) => (
      <Select value={value} defaultValue={defaultValue} onValueChange={onValueChange} isDisabled={isDisabled}>
        <SelectTrigger
          ref={ref}
          id={fieldProps.id}
          status={status}
          placeholder={placeholder}
          className="w-full"
          aria-describedby={fieldProps['aria-describedby']}
          aria-invalid={fieldProps['aria-invalid']}
        />
        <SelectContent>
          {children}
        </SelectContent>
      </Select>
    )}
  </FormField>
)

export { SelectField }
