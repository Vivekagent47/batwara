import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import {
  getSplitInputPlaceholder,
  type ParticipantState,
} from "@/lib/expense-form"
import type { ExpenseSplitMethod } from "@/lib/dashboard-server/types"

type SplitParticipantsEditorProps = {
  members: Array<{
    id: string
    name: string
  }>
  participants: Partial<Record<string, ParticipantState>>
  splitMethod: ExpenseSplitMethod
  onEnabledChange: (userId: string, enabled: boolean) => void
  onValueChange: (userId: string, value: string) => void
}

export function SplitParticipantsEditor({
  members,
  participants,
  splitMethod,
  onEnabledChange,
  onValueChange,
}: SplitParticipantsEditorProps) {
  return (
    <div className="space-y-2">
      {members.map((entry) => {
        const enabled = participants[entry.id]?.enabled ?? false
        return (
          <div
            key={entry.id}
            className="dashboard-list-item grid grid-cols-[auto_1fr_auto] items-center gap-2"
          >
            <Checkbox
              checked={enabled}
              onCheckedChange={(checked) => onEnabledChange(entry.id, checked === true)}
              className="size-4"
            />
            <span className="text-sm">{entry.name}</span>
            {splitMethod === "equal" ? null : (
              <Input
                value={participants[entry.id]?.value ?? ""}
                onChange={(event) => onValueChange(entry.id, event.target.value)}
                inputMode="decimal"
                placeholder={getSplitInputPlaceholder(splitMethod)}
                className="h-9 w-24 rounded-lg border-input/80 bg-background/80 text-right"
                disabled={!enabled}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
