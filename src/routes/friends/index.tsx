import { createFileRoute, useRouter } from "@tanstack/react-router"
import { useServerFn } from "@tanstack/react-start"
import { HandHelpingIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useState } from "react"
import { toast } from "sonner"
import type { ReactNode } from "react"

import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useIsMobile } from "@/hooks/use-mobile"
import { formatMoneyMinor, getBalanceToneByDirection } from "@/lib/dashboard-format"
import { createFriendLedger, getFriendsPageData } from "@/lib/dashboard-server"

export const Route = createFileRoute("/friends/")({
  loader: () => getFriendsPageData(),
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

function AddFriendLedgerModal({
  open,
  onOpenChange,
  children,
  footer,
}: {
  open: boolean
  onOpenChange: (nextOpen: boolean) => void
  children: ReactNode
  footer: ReactNode
}) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[92svh] rounded-t-3xl border-border/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(248,245,238,0.96))] shadow-[0_-12px_32px_rgba(21,29,21,0.18)]">
          <DrawerHeader className="items-start px-5 pb-2 text-left">
            <DrawerTitle className="font-heading text-[1.65rem] leading-none">
              Add friend ledger
            </DrawerTitle>
            <DrawerDescription className="max-w-prose text-sm leading-relaxed">
              Open a direct 1:1 ledger with a verified Batwara user.
            </DrawerDescription>
          </DrawerHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-3">
            {children}
          </div>
          <DrawerFooter className="border-t border-border/70 px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.9rem)]">
            {footer}
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-xl gap-0 rounded-3xl border border-border/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(248,245,238,0.96))] p-0 shadow-[0_24px_56px_rgba(24,30,23,0.18)]"
        showCloseButton
      >
        <DialogHeader className="border-b border-border/70 px-7 py-5">
          <DialogTitle className="font-heading text-[2rem] leading-none">
            Add friend ledger
          </DialogTitle>
          <DialogDescription className="max-w-prose text-sm leading-relaxed">
            Open a direct 1:1 ledger with a verified Batwara user.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[62vh] overflow-y-auto px-7 py-5">{children}</div>
        <DialogFooter className="border-t border-border/70 px-7 py-4">
          {footer}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function FriendsPage() {
  const data = Route.useLoaderData()
  const router = useRouter()
  const createFriendFn = useServerFn(createFriendLedger)
  const [createOpen, setCreateOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [isPending, setIsPending] = useState(false)

  const onAddFriend = async () => {
    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail) {
      toast.error("Friend email is required")
      return
    }

    setIsPending(true)
    try {
      const result = await createFriendFn({ data: { email: normalizedEmail } })
      setEmail("")
      setCreateOpen(false)
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
        <div className="flex flex-wrap items-center gap-2">
          <div className="dashboard-pill">
            <HugeiconsIcon
              icon={HandHelpingIcon}
              className="mr-1.5 size-3.5"
              strokeWidth={1.7}
            />
            {data.friends.length} active friend ledger
            {data.friends.length === 1 ? "" : "s"}
          </div>
          <Button
            type="button"
            className="h-10 rounded-xl"
            onClick={() => setCreateOpen(true)}
          >
            <HugeiconsIcon
              icon={HandHelpingIcon}
              className="size-4"
              strokeWidth={1.8}
            />
            Add friend ledger
          </Button>
        </div>
      }
    >
      <section className="dashboard-surface">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-heading text-xl">Your friend ledgers</h2>
          {data.friends.length > 0 ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 rounded-xl"
              onClick={() => setCreateOpen(true)}
            >
              New ledger
            </Button>
          ) : null}
        </div>

        <div className="space-y-2">
          {data.friends.length === 0 ? (
            <div className="dashboard-empty space-y-3">
              <p>
                No friend ledgers yet. Add a verified Batwara user email to
                start one.
              </p>
              <Button
                type="button"
                className="h-10 rounded-xl"
                onClick={() => setCreateOpen(true)}
              >
                <HugeiconsIcon
                  icon={HandHelpingIcon}
                  className="size-4"
                  strokeWidth={1.8}
                />
                Add your first friend ledger
              </Button>
            </div>
          ) : (
            data.friends.map((entry) => (
              <div
                key={entry.id}
                className="dashboard-list-item flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {entry.otherUser.name}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {entry.otherUser.email}
                  </p>
                </div>
                <div className="text-right">
                  {entry.summary ? (
                    <p
                      className={`${getBalanceToneByDirection(entry.summary.direction)} text-sm font-medium [font-variant-numeric:tabular-nums]`}
                    >
                      {entry.summary.direction === "pay"
                        ? "You owe "
                        : "You are owed "}
                      {formatMoneyMinor(entry.summary.amountMinor)}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">Balanced</p>
                  )}
                  <p className="text-xs text-muted-foreground capitalize">
                    {entry.status}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <AddFriendLedgerModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        footer={
          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-xl sm:min-w-26"
              onClick={() => setCreateOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="h-11 rounded-xl sm:min-w-36"
              disabled={isPending}
              onClick={() => void onAddFriend()}
            >
              {isPending ? "Adding..." : "Add friend ledger"}
            </Button>
          </div>
        }
      >
        <section className="space-y-2 rounded-2xl border border-border/70 bg-background/75 p-3.5 sm:p-4">
          <Label className="text-sm font-medium text-foreground">
            Friend email
          </Label>
          <Input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault()
                void onAddFriend()
              }
            }}
            placeholder="friend@example.com"
            type="email"
            className="h-11 rounded-xl border-input/80 bg-background/75"
          />
          <p className="text-xs text-muted-foreground">
            Use a verified Batwara user email to open a direct private ledger.
          </p>
        </section>
      </AddFriendLedgerModal>
    </DashboardShell>
  )
}
