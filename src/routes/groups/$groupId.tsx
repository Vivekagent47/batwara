import { Link, createFileRoute } from "@tanstack/react-router"
import { ArrowRight01Icon, ReceiptTextIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useState } from "react"

import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { ManageMembersModal } from "@/components/groups/manage-members-modal"
import { formatMoneyMinor, formatRelativeDate } from "@/lib/dashboard-format"
import { getGroupDetailsData } from "@/lib/dashboard-server"

const actionBaseClass =
  "inline-flex items-center justify-center rounded-xl border text-center font-medium whitespace-nowrap transition-colors"
const actionPrimaryClass = `${actionBaseClass} border-primary/35 bg-primary text-primary-foreground hover:bg-primary/90`
const actionSecondaryClass = `${actionBaseClass} border-border bg-background hover:bg-muted/60`

export const Route = createFileRoute("/groups/$groupId")({
  loader: async ({ params }) =>
    getGroupDetailsData({ data: { groupId: params.groupId } }),
  head: () => ({
    meta: [
      {
        title: "Group Ledger | Batwara",
      },
      {
        name: "robots",
        content: "noindex,nofollow",
      },
    ],
  }),
  component: GroupDetailsPage,
})

function GroupDetailsPage() {
  const data = Route.useLoaderData()
  const [manageMembersOpen, setManageMembersOpen] = useState(false)

  return (
    <DashboardShell
      title={data.group.name}
      description="Group-level balances, simplified settlements, and recent expense history."
      headerActions={
        <div className="hidden items-center gap-2 sm:flex">
          <Link
            to="/expense/new"
            className={`${actionPrimaryClass} h-10 gap-2 px-4 text-sm`}
          >
            <HugeiconsIcon
              icon={ReceiptTextIcon}
              className="size-4"
              strokeWidth={1.7}
            />
            Add expense
          </Link>
          <Link
            to="/settle/new"
            className={`${actionSecondaryClass} h-10 px-4 text-sm`}
          >
            Settle up
          </Link>
          <button
            type="button"
            className={`${actionSecondaryClass} h-10 px-4 text-sm`}
            onClick={() => setManageMembersOpen(true)}
          >
            Manage members
          </button>
        </div>
      }
    >
      <section className="mb-4 dashboard-surface sm:hidden">
        <p className="dashboard-label mb-2">Quick actions</p>
        <div className="grid grid-cols-2 gap-2">
          <Link
            to="/settle/new"
            className={`${actionSecondaryClass} min-h-11 px-2 text-[13px]`}
          >
            Settle up
          </Link>
          <button
            type="button"
            className={`${actionSecondaryClass} min-h-11 px-2 text-[13px]`}
            onClick={() => setManageMembersOpen(true)}
          >
            Manage members
          </button>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
        <section className="rounded-2xl border border-border/80 bg-background/95 p-4">
          <h2 className="font-heading text-xl">Balances by member</h2>
          <div className="mt-3 space-y-2">
            {data.balances.map((entry) => (
              <div
                key={entry.userId}
                className="flex items-center justify-between rounded-xl border border-border/70 px-3 py-3"
              >
                <div>
                  <p className="text-sm font-medium">{entry.name}</p>
                </div>
                <p
                  className={`text-sm font-medium ${entry.netMinor >= 0 ? "text-primary" : "text-foreground"}`}
                >
                  {entry.netMinor >= 0
                    ? `gets ${formatMoneyMinor(entry.netMinor)}`
                    : `owes ${formatMoneyMinor(Math.abs(entry.netMinor))}`}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-border/80 bg-background/95 p-4">
          <h2 className="font-heading text-xl">Simplified settlements</h2>
          <div className="mt-3 space-y-2">
            {data.transfers.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border px-3 py-5 text-sm text-muted-foreground">
                No pending settle-up transfers for this group.
              </p>
            ) : (
              data.transfers.map((entry) => (
                <div
                  key={`${entry.payerUserId}-${entry.payeeUserId}`}
                  className="flex items-center justify-between rounded-xl border border-border/70 px-3 py-3"
                >
                  <p className="text-sm">
                    <span className="font-medium">{entry.payerName}</span> pays{" "}
                    <span className="font-medium">{entry.payeeName}</span>
                  </p>
                  <p className="text-sm font-medium">
                    {formatMoneyMinor(entry.amountMinor)}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <section className="mt-4 rounded-2xl border border-border/80 bg-background/95 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-heading text-xl">Recent expenses</h2>
          <Link
            to="/expense/new"
            className="inline-flex items-center gap-1 text-xs font-medium text-primary"
          >
            Add another
            <HugeiconsIcon
              icon={ArrowRight01Icon}
              className="size-3.5"
              strokeWidth={1.7}
            />
          </Link>
        </div>
        <div className="space-y-2">
          {data.recentExpenses.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-3 py-5 text-sm text-muted-foreground">
              Add the first expense in this group to start the ledger.
            </p>
          ) : (
            data.recentExpenses.map((entry) => (
              <div
                key={entry.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/70 px-3 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {entry.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Paid by {entry.paidByName} ·{" "}
                    {formatRelativeDate(new Date(entry.incurredAt))}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">
                    {formatMoneyMinor(entry.totalAmountMinor, entry.currency)}
                  </p>
                  <p className="text-xs text-muted-foreground uppercase">
                    {entry.splitMethod}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <ManageMembersModal
        open={manageMembersOpen}
        onOpenChange={setManageMembersOpen}
        groupId={data.group.id}
        groupName={data.group.name}
        canManageMembers={data.canManageMembers}
        viewerRole={data.viewerRole}
        friendCandidates={data.friendCandidates}
      />
    </DashboardShell>
  )
}
