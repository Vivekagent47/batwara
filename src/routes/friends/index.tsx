import { Link, createFileRoute, useRouter } from "@tanstack/react-router"
import { useServerFn } from "@tanstack/react-start"
import { ArrowRight01Icon, HandHelpingIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useState } from "react"
import { toast } from "sonner"
import type { FormEvent } from "react"

import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { formatMoneyMinor } from "@/lib/dashboard-format"
import { createFriendLedger, getFriendsPageData } from "@/lib/dashboard-server"

export const Route = createFileRoute("/friends/")({
  loader: async () => getFriendsPageData(),
  head: () => ({
    meta: [
      {
        title: "Friend Ledgers | Batwara",
      },
      {
        name: "robots",
        content: "noindex,nofollow",
      },
    ],
  }),
  component: FriendsPage,
})

function FriendsPage() {
  const data = Route.useLoaderData()
  const router = useRouter()
  const createFriendFn = useServerFn(createFriendLedger)
  const [email, setEmail] = useState("")
  const [isPending, setIsPending] = useState(false)

  const handleAddFriend = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsPending(true)
    try {
      const result = await createFriendFn({ data: { email } })
      setEmail("")
      toast.success(
        result.alreadyExists
          ? "Ledger already exists for this friend."
          : "Friend ledger created.",
        {
          description:
            "You can now add direct expenses and settle balances from the same dashboard.",
        }
      )
      await router.invalidate()
    } catch (error) {
      toast.error("Could not add friend ledger", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      })
    } finally {
      setIsPending(false)
    }
  }

  return (
    <DashboardShell
      title="Friend ledgers"
      description="Direct 1:1 ledgers for simple balances outside formal groups."
      headerActions={
        <Link
          to="/expense/new"
          className="inline-flex h-10 items-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Add direct expense
        </Link>
      }
    >
      <div className="grid gap-4 xl:grid-cols-[1fr_0.7fr]">
        <section className="dashboard-surface">
          <h2 className="font-heading text-xl">Active friends</h2>
          <div className="mt-3 space-y-2">
            {data.friends.length === 0 ? (
              <p className="dashboard-empty">
                No friend ledgers yet. Add a verified Batwara user email to
                start one.
              </p>
            ) : (
              data.friends.map((entry) => (
                <div
                  key={entry.id}
                  className="dashboard-list-item flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {entry.otherUser.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {entry.otherUser.email}
                    </p>
                  </div>
                  <div className="text-right">
                    {entry.summary ? (
                      <p className="text-sm font-medium">
                        {entry.summary.direction === "pay"
                          ? "You owe "
                          : "You are owed "}
                        {formatMoneyMinor(entry.summary.amountMinor)}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">Balanced</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {entry.status}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="dashboard-surface">
          <h2 className="font-heading text-xl">Add friend ledger</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Add someone by their Batwara email to open a private shared ledger.
          </p>
          <form className="mt-4 space-y-3" onSubmit={handleAddFriend}>
            <label className="space-y-1 text-sm">
              <span className="dashboard-label">Friend email</span>
              <Input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="friend@example.com"
                className="h-11 rounded-xl border-input/80 bg-background/75"
              />
            </label>
            <Button
              type="submit"
              disabled={isPending}
              className="h-11 w-full gap-2 rounded-xl text-sm"
            >
              <HugeiconsIcon
                icon={HandHelpingIcon}
                className="size-4"
                strokeWidth={1.8}
              />
              {isPending ? "Adding..." : "Add friend ledger"}
            </Button>
          </form>
          <Link
            to="/settle/new"
            className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary"
          >
            Jump to settle-up
            <HugeiconsIcon
              icon={ArrowRight01Icon}
              className="size-3.5"
              strokeWidth={1.7}
            />
          </Link>
        </section>
      </div>
    </DashboardShell>
  )
}
