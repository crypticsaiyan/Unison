"use client"

import { DropDownList, DropDownListChangeEvent } from "@progress/kendo-react-dropdowns"
import type { LanguageOption } from "@/lib/languages"

interface KendoLanguageSelectProps {
  value: string
  onChange: (code: string) => void
  languages: LanguageOption[]
  label?: string
  disabled?: boolean
  className?: string
}

function itemRender(li: React.ReactElement<HTMLLIElement>, itemProps: { dataItem: LanguageOption }) {
  const lang = itemProps.dataItem
  const children = (
    <span className="flex items-center gap-2">
      <span className="text-lg leading-none">{lang.flag}</span>
      <span>{lang.name}</span>
    </span>
  )
  return { ...li, props: { ...li.props, children } } as React.ReactElement
}

function valueRender(
  element: React.ReactElement<HTMLSpanElement>,
  value: LanguageOption | null
) {
  if (!value) return element
  const children = (
    <span className="flex items-center gap-2">
      <span className="text-lg leading-none">{value.flag}</span>
      <span>{value.name}</span>
    </span>
  )
  return { ...element, props: { ...element.props, children } } as React.ReactElement
}

export function KendoLanguageSelect({
  value,
  onChange,
  languages,
  label,
  disabled = false,
  className,
}: KendoLanguageSelectProps) {
  const selected = languages.find((l) => l.code === value) ?? null

  return (
    <div className={className}>
      {label && (
        <label className="mb-2 block text-sm font-medium text-muted-foreground">{label}</label>
      )}
      <DropDownList
        data={languages}
        textField="name"
        dataItemKey="code"
        value={selected}
        disabled={disabled}
        itemRender={itemRender as any}
        valueRender={valueRender as any}
        onChange={(e: DropDownListChangeEvent) => {
          const item = e.value as LanguageOption | null
          if (item?.code) onChange(item.code)
        }}
        style={{ width: "100%" }}
      />
    </div>
  )
}
