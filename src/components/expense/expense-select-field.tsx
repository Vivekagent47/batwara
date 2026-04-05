import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"

type ExpenseSelectFieldProps = {
  label: string
  value: string
  onValueChange: (value: string) => void
  options: Array<{
    value: string
    label: string
    disabled?: boolean
  }>
  placeholder?: string
}

export function ExpenseSelectField({
  label,
  value,
  onValueChange,
  options,
  placeholder,
}: ExpenseSelectFieldProps) {
  const selectedLabel = options.find((option) => option.value === value)?.label

  return (
    <div className="space-y-1.5">
      <Label className="text-[13px] leading-none text-muted-foreground">
        {label}
      </Label>
      <Select
        value={value}
        onValueChange={(nextValue) => onValueChange(nextValue ?? "")}
      >
        <SelectTrigger className="h-11 w-full rounded-xl border-input/80 bg-background/75">
          <SelectValue placeholder={placeholder}>{selectedLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent align="start" sideOffset={6}>
          {options.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
