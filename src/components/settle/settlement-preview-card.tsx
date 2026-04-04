import { formatMoneyMinor } from "@/lib/dashboard-format"
import { cn } from "@/lib/utils"
import type { SettlementPreviewState } from "@/hooks/use-settlement-preview"

type SettlementPreviewCardProps = {
  preview: SettlementPreviewState | null
  previewError: string | null
  isPreviewPending: boolean
  isOutgoingSettlement: boolean
}

export function SettlementPreviewCard({
  preview,
  previewError,
  isPreviewPending,
  isOutgoingSettlement,
}: SettlementPreviewCardProps) {
  return (
    <aside className="dashboard-surface rounded-2xl">
      <p className="text-xs tracking-[0.14em] text-muted-foreground uppercase">
        Allocation preview
      </p>
      <h2 className="mt-2 font-heading text-2xl">Where this payment lands</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Batwara applies pairwise settlements to the oldest shared balances first.
        Group balances can change even when you do not choose a group explicitly.
      </p>

      {isPreviewPending ? (
        <p className="mt-4 rounded-xl border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
          Previewing allocation...
        </p>
      ) : previewError ? (
        <p className="mt-4 rounded-xl border border-dashed border-destructive/30 bg-destructive/5 px-3 py-4 text-sm text-destructive">
          {previewError}
        </p>
      ) : preview ? (
        <div className="mt-4 space-y-3">
          <div
            className={cn(
              "rounded-2xl border p-3",
              isOutgoingSettlement
                ? "border-destructive/25 bg-destructive/5"
                : "border-primary/25 bg-primary/5"
            )}
          >
            <p
              className={cn(
                "text-xs uppercase",
                isOutgoingSettlement ? "text-destructive/80" : "text-primary/80"
              )}
            >
              Net outstanding for this direction
            </p>
            <p
              className={cn(
                "mt-1 font-heading text-2xl",
                isOutgoingSettlement ? "text-destructive" : "text-primary"
              )}
            >
              {formatMoneyMinor(preview.outstandingTotal)}
            </p>
          </div>

          <div className="space-y-2">
            {preview.allocations.map((entry) => (
              <div
                key={`${entry.scopeType}-${entry.scopeId}`}
                className="dashboard-list-item flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {entry.scopeName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {entry.scopeType === "group"
                      ? "Group balance"
                      : "Direct balance"}
                  </p>
                </div>
                <p className="text-sm font-medium">
                  {formatMoneyMinor(entry.amountMinor)}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="mt-4 rounded-xl border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
          Choose a counterparty and amount to preview how the payment will be
          distributed.
        </p>
      )}
    </aside>
  )
}
