'use client'

import type { LucideIcon } from 'lucide-react'

import { CheckIcon, ChevronsUpDownIcon, XIcon } from 'lucide-react'
import { memo, useCallback, useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  TreeCollapsibleChevron,
  TreeCollapsibleContent,
  TreeCollapsibleIcon,
  TreeCollapsibleRoot,
  TreeCollapsibleTitle,
  TreeCollapsibleTrigger,
} from '@/components/ui/stack/tree-collapsible'
import { cn } from '@/lib/utils'

export interface SelectableEntity {
  id: string
  label: string
  description?: string
  avatarUrl?: string | null
  searchTerms?: string[]
}

export interface EntityGroup {
  key: string
  label: string
  icon: LucideIcon
  entities: SelectableEntity[]
}

interface GroupedComboboxProps {
  groups: EntityGroup[]
  selected: Array<{ groupKey: string, entityId: string }>
  onChange: (selected: Array<{ groupKey: string, entityId: string }>) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  className?: string
  disabled?: boolean
  singleSelect?: boolean
  id?: string
}

const STICKY_CONFIG = {
  rowHeight: 32,
  baseZIndex: 30,
} as const

const SEARCH_RESULTS_LIMIT = 200

const getDisplayLabel = (entity: SelectableEntity) =>
  entity.label?.trim() || entity.searchTerms?.[0] || 'Unknown'

interface SelectedTagProps {
  entity: SelectableEntity
  icon: LucideIcon
  groupKey: string
  onRemove: (groupKey: string, entityId: string, e: React.MouseEvent) => void
}

const SelectedTag = ({ entity, icon: Icon, groupKey, onRemove }: SelectedTagProps) => {
  const handleClick = (e: React.MouseEvent) => onRemove(groupKey, entity.id, e)

  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-secondary pl-2 pr-0.5 py-0.5 text-sm">
      {entity.avatarUrl
        ? (
            <img
              src={entity.avatarUrl}
              alt={entity.label}
              className="size-5 rounded-lg"
            />
          )
        : (
            <Icon className="size-3 shrink-0" />
          )}
      <span className="truncate max-w-[120px]">{getDisplayLabel(entity)}</span>
      <Button
        type="button"
        variant="ghost"
        onClick={handleClick}
        className="p-0.5 h-auto rounded-sm hover:bg-secondary-foreground/10"
      >
        <XIcon size={12} />
      </Button>
    </span>
  )
}

interface SelectedEntityItem {
  entity: SelectableEntity
  icon: LucideIcon
  groupKey: string
}

interface SelectedTagsProps {
  selectedEntities: SelectedEntityItem[]
  onRemove: (groupKey: string, entityId: string, e: React.MouseEvent) => void
}

interface EntityGroupSectionProps {
  group: EntityGroup
  groupIndex: number
  selectedSet: Set<string>
  selectionCount: number
  onToggle: (groupKey: string, entityId: string) => void
  reopenTrigger?: unknown
}

const SelectedTags = ({ selectedEntities, onRemove }: SelectedTagsProps) => (
  <div className="relative min-w-0 flex-1 overflow-hidden">
    <div className="flex gap-1 overflow-x-auto no-scrollbar pr-6">
      {selectedEntities.map(({ entity, icon, groupKey }) => (
        <SelectedTag
          key={`${groupKey}:${entity.id}`}
          entity={entity}
          icon={icon}
          groupKey={groupKey}
          onRemove={onRemove}
        />
      ))}
    </div>
    <div className="absolute right-0 top-0 bottom-0 w-6 pointer-events-none">
      <div className="absolute inset-0 bg-gradient-to-l from-background to-transparent transition-opacity group-hover:opacity-0" />
      <div className="absolute inset-0 bg-gradient-to-l from-accent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
    </div>
  </div>
)

interface EntityItemProps {
  entity: SelectableEntity
  isSelected: boolean
  onToggle: (groupKey: string, entityId: string) => void
  icon: LucideIcon
  groupKey: string
}

const SelectableItem = memo(({ entity, isSelected, onToggle, icon: Icon, groupKey }: EntityItemProps) => {
  const handleSelect = useCallback(() => {
    onToggle(groupKey, entity.id)
  }, [onToggle, groupKey, entity.id])

  return (
    <CommandItem
      value={`${groupKey}:${entity.id}`}
      onSelect={handleSelect}
      className={cn('flex items-center gap-2 rounded-md py-2 text-sm w-full cursor-pointer px-2 my-1', isSelected && 'bg-accent')}
    >
      {entity.avatarUrl
        ? (
            <img
              src={entity.avatarUrl}
              alt={entity.label}
              className="size-5 rounded-lg"
            />
          )
        : (
            <Icon className="size-4 shrink-0" />
          )}
      <div className="flex-1 min-w-0">
        <span className="block truncate">{getDisplayLabel(entity)}</span>
        {entity.description && (
          <span className="line-clamp-3 text-muted-foreground">{entity.description}</span>
        )}
      </div>
      <CheckIcon
        size={16}
        className={cn(
          'shrink-0 transition-opacity',
          isSelected ? 'opacity-100' : 'opacity-0',
        )}
      />
    </CommandItem>
  )
})

const getGroupSelectionCount = (selected: { groupKey: string }[], groupKey: string) =>
  selected.filter((s) => s.groupKey === groupKey).length

const stopPropagation = (e: React.UIEvent) => e.stopPropagation()

const EntityGroupSection = memo(({
  group,
  groupIndex,
  selectedSet,
  selectionCount,
  onToggle,
  reopenTrigger,
}: EntityGroupSectionProps) => {
  const countBadge = selectionCount > 0
    ? (
        <span className="font-mono size-4 rounded-full bg-muted-foreground px-1 text-primary-foreground text-xs flex items-center justify-center min-w-4 w-fit">
          {selectionCount}
        </span>
      )
    : null

  return (
    <TreeCollapsibleRoot defaultOpen reopenTrigger={reopenTrigger}>
      <TreeCollapsibleTrigger
        stickyTop={groupIndex === 0 ? 0 : (groupIndex * STICKY_CONFIG.rowHeight) + 4}
        stickyZIndex={STICKY_CONFIG.baseZIndex - groupIndex}
        stickyPadding={groupIndex === 0 ? 'pt-1' : undefined}
        className="px-2 text-muted-foreground"
      >
        <TreeCollapsibleIcon>
          <group.icon className="size-4" />
        </TreeCollapsibleIcon>
        <TreeCollapsibleTitle>{group.label}</TreeCollapsibleTitle>
        {countBadge}
        <TreeCollapsibleChevron />
      </TreeCollapsibleTrigger>
      <TreeCollapsibleContent>
        {group.entities.map((entity) => (
          <SelectableItem
            key={`${group.key}:${entity.id}`}
            entity={entity}
            isSelected={selectedSet.has(`${group.key}:${entity.id}`)}
            onToggle={onToggle}
            icon={group.icon}
            groupKey={group.key}
          />
        ))}
      </TreeCollapsibleContent>
    </TreeCollapsibleRoot>
  )
})

export const GroupedCombobox = ({
  groups,
  selected,
  onChange,
  placeholder = 'Select...',
  searchPlaceholder,
  emptyMessage = 'No results found.',
  className,
  disabled = false,
  singleSelect = false,
  id,
}: GroupedComboboxProps) => {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const selectedSet = useMemo(
    () => new Set(selected.map((s) => `${s.groupKey}:${s.entityId}`)),
    [selected],
  )

  const filteredGroups = useMemo(() => {
    const searchLower = search.toLowerCase()

    const allMatches = groups.flatMap((group) => {
      const seenIds = new Set<string>()

      return group.entities
        .filter((entity) => {
          if (seenIds.has(entity.id)) return false
          seenIds.add(entity.id)

          return entity.label.toLowerCase().includes(searchLower) ||
            entity.searchTerms?.some((term) => term.toLowerCase().includes(searchLower))
        })
        .map((entity) => ({ group, entity }))
    }).slice(0, SEARCH_RESULTS_LIMIT)

    const groupedResults = new Map<string, { group: EntityGroup, entities: SelectableEntity[] }>()

    for (const { group, entity } of allMatches) {
      const existing = groupedResults.get(group.key)
      if (existing) {
        existing.entities.push(entity)
      } else {
        groupedResults.set(group.key, { group, entities: [entity] })
      }
    }

    return Array.from(groupedResults.values()).map(({ group, entities }) => ({
      ...group,
      entities,
    }))
  }, [groups, search])

  const selectedEntities = useMemo(() => selected.flatMap<SelectedEntityItem>((s) => {
    const group = groups.find((g) => g.key === s.groupKey)
    const entity = group?.entities.find((e) => e.id === s.entityId)

    return entity && group ? [{ entity, icon: group.icon, groupKey: s.groupKey }] : []
  }), [selected, groups])

  const toggleSelection = useCallback((groupKey: string, entityId: string) => {
    if (singleSelect) {
      onChange([{ groupKey, entityId }])
      setOpen(false)
      setSearch('')

      return
    }
    if (selectedSet.has(`${groupKey}:${entityId}`)) {
      onChange(selected.filter((s) => !(s.groupKey === groupKey && s.entityId === entityId)))
    } else {
      onChange([...selected, { groupKey, entityId }])
    }
  }, [singleSelect, onChange, selectedSet, selected])

  const removeSelection = (groupKey: string, entityId: string, e: React.MouseEvent) => {
    e.stopPropagation()

    onChange(selected.filter((s) => !(s.groupKey === groupKey && s.entityId === entityId)))
  }

  const clearSelections = () => {
    onChange([])
  }

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setSearch('')
    }
    setOpen(isOpen)
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild disabled={disabled}>
        <Button
          id={id}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'group w-full max-w-full overflow-hidden justify-between font-normal pl-2 pr-2.5 py-1 h-auto min-h-9',
            className,
          )}
        >
          {selectedEntities.length > 0
            ? (
                <SelectedTags
                  selectedEntities={selectedEntities}
                  onRemove={removeSelection}
                />
              )
            : <span className="text-muted-foreground">{placeholder}</span>}
          <ChevronsUpDownIcon className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0 flex flex-col max-h-[calc(var(--radix-popover-content-available-height)-16px)] overflow-hidden"
        align="start"
      >
        <Command shouldFilter={false} className="flex flex-col overflow-hidden">
          <CommandInput
            placeholder={searchPlaceholder}
            value={search}
            onValueChange={setSearch}
            className="border-none px-0 focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            disabled={disabled}
          />
          <CommandList
            className="max-h-[300px] flex-1 overflow-y-auto px-1 pb-1"
            onWheelCapture={stopPropagation}
          >
            {filteredGroups.length === 0
              ? <CommandEmpty>{emptyMessage}</CommandEmpty>
              : filteredGroups.map((group, groupIndex) => (
                  <EntityGroupSection
                    key={group.key}
                    group={group}
                    groupIndex={groupIndex}
                    selectedSet={selectedSet}
                    selectionCount={getGroupSelectionCount(selected, group.key)}
                    onToggle={toggleSelection}
                    reopenTrigger={search}
                  />
                ))}
          </CommandList>

          {!singleSelect && selected.length > 0 && (
            <div className="border-t p-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearSelections}
                className="w-full text-destructive flex gap-2"
              >
                <XIcon size={14} />
                Clear selections
              </Button>
            </div>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  )
}
