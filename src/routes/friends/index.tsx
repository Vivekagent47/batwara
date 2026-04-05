import { Link, createFileRoute, useRouter } from "@tanstack/react-router"
import { useServerFn } from "@tanstack/react-start"
import { ArrowRight01Icon } from "@hugeicons/core-free-icons"
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
import {
  formatMoneyMinor,
  getBalanceToneByDirection,
} from "@/lib/dashboard-format"
import { createFriendLedger, getFriendsPageData } from "@/lib/dashboard-server"

export const Route = createFileRoute("/friends/")({
  loader: () => getFriendsPageData(),
  head: () => ({
    meta: [
      {
        title: "Friends | Batwara",
      },
      {
        name: "robots",
        content: "noindex,nofollow",
      },
    ],
  }),
  component: FriendsPage,
})

function formatSharedGroupLabel(count: number) {
  return `${count} shared group${count === 1 ? "" : "s"}`
}

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
              New friend
            </DrawerTitle>
            <DrawerDescription className="max-w-prose text-sm leading-relaxed">
              Start a direct ledger with a verified Batwara user.
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
            New friend
          </DialogTitle>
          <DialogDescription className="max-w-prose text-sm leading-relaxed">
            Start a direct ledger with a verified Batwara user.
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
          ? "Friend already exists."
          : "Friend ledger created.",
        {
          description: "You can now add direct expenses in this ledger.",
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
      title="Friends"
      description="Direct friend ledgers and pairwise balances from shared groups."
      headerActions={
        <Button
          type="button"
          className="h-10 rounded-xl"
          onClick={() => setCreateOpen(true)}
        >
          New friend
        </Button>
      }
    >
      <section className="mx-auto w-full max-w-3xl">
        <div className="space-y-2.5">
          {data.friends.length === 0 ? (
            <div className="dashboard-empty space-y-2.5">
              <p>No shared ledgers yet.</p>
              <Button
                type="button"
                className="h-10 rounded-xl"
                onClick={() => setCreateOpen(true)}
              >
                Add a friend
              </Button>
            </div>
          ) : (
            data.friends.map((entry) => (
              <Link
                key={entry.routeKey}
                to="/friends/$friendId"
                params={{ friendId: entry.routeKey }}
                className="group block rounded-2xl border border-border/70 bg-background/85 px-3 py-3 transition-colors hover:border-primary/35 hover:bg-muted/35 sm:px-3.5 sm:py-3.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground sm:text-base">
                      {entry.otherUser.name}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="truncate">{entry.otherUser.email}</span>
                      <span className="rounded-full border border-border/70 bg-background/90 px-2 py-0.5 text-[11px]">
                        {entry.isFriend ? "Friend" : "Shared balance"}
                      </span>
                      {entry.sharedGroupCount > 0 ? (
                        <span className="rounded-full border border-border/70 bg-background/90 px-2 py-0.5 text-[11px]">
                          {formatSharedGroupLabel(entry.sharedGroupCount)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-start gap-2">
                    {entry.summary ? (
                      <p
                        className={`min-w-26 text-right text-xs font-medium [font-variant-numeric:tabular-nums] ${getBalanceToneByDirection(entry.summary.direction)}`}
                      >
                        {entry.summary.direction === "pay"
                          ? "You owe "
                          : "You get "}
                        {formatMoneyMinor(entry.summary.amountMinor)}
                      </p>
                    ) : (
                      <p className="pt-1 text-xs text-muted-foreground">
                        Balanced
                      </p>
                    )}
                    <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-border/70 bg-background/85 text-muted-foreground transition-colors group-hover:border-primary/40 group-hover:text-foreground">
                      <HugeiconsIcon
                        icon={ArrowRight01Icon}
                        className="size-4"
                        strokeWidth={1.7}
                      />
                    </span>
                  </div>
                </div>
              </Link>
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
              {isPending ? "Adding..." : "Add friend"}
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
            Use a verified Batwara user email.
          </p>
        </section>
      </AddFriendLedgerModal>
    </DashboardShell>
  )
}
