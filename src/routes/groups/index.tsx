import { Link, createFileRoute, useNavigate } from "@tanstack/react-router"
import { useServerFn } from "@tanstack/react-start"
import { ArrowRight01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useMemo, useState } from "react"
import { toast } from "sonner"
import type { ReactNode } from "react"

import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { formatMoneyMinor, getBalanceToneByNetMinor } from "@/lib/dashboard-format"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useIsMobile } from "@/hooks/use-mobile"
import {
  createGroup,
  getGroupsPageData,
  lookupGroupMemberByEmail,
} from "@/lib/dashboard-server"

export const Route = createFileRoute("/groups/")({
  loader: () => getGroupsPageData(),
  head: () => ({
    meta: [
      {
        title: "Groups | Batwara",
      },
      {
        name: "robots",
        content: "noindex,nofollow",
      },
    ],
  }),
  component: GroupsPage,
})

type GroupMemberOption = {
  id: string
  name: string
  email: string
}

function CreateGroupModal({
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
              Create a group
            </DrawerTitle>
            <DrawerDescription className="max-w-prose text-sm leading-relaxed">
              Pick members from friends or search Batwara users by email.
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
        className="max-w-2xl gap-0 rounded-3xl border border-border/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(248,245,238,0.96))] p-0 shadow-[0_24px_56px_rgba(24,30,23,0.18)]"
        showCloseButton
      >
        <DialogHeader className="border-b border-border/70 px-7 py-5">
          <DialogTitle className="font-heading text-[2rem] leading-none">
            Create a group
          </DialogTitle>
          <DialogDescription className="max-w-prose text-sm leading-relaxed">
            Pick members from friends or search Batwara users by email.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-y-auto px-7 py-5">{children}</div>
        <DialogFooter className="border-t border-border/70 px-7 py-4">
          {footer}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function GroupsPage() {
  const data = Route.useLoaderData()
  const navigate = useNavigate()
  const createGroupFn = useServerFn(createGroup)
  const lookupGroupMemberByEmailFn = useServerFn(lookupGroupMemberByEmail)
  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState("")
  const [friendCandidateId, setFriendCandidateId] = useState("")
  const [emailQuery, setEmailQuery] = useState("")
  const [selectedMembers, setSelectedMembers] = useState<
    Record<string, GroupMemberOption>
  >({})
  const [isLookupPending, setIsLookupPending] = useState(false)
  const [isPending, setIsPending] = useState(false)

  const selectedMemberList = useMemo(
    () =>
      Object.values(selectedMembers).sort((a, b) =>
        a.name.localeCompare(b.name)
      ),
    [selectedMembers]
  )

  const friendOptions = useMemo(
    () =>
      data.friendCandidates.filter(
        (entry) => !Object.hasOwn(selectedMembers, entry.id)
      ),
    [data.friendCandidates, selectedMembers]
  )

  const clearComposer = () => {
    setName("")
    setFriendCandidateId("")
    setEmailQuery("")
    setSelectedMembers({})
  }

  const addSelectedMember = (candidate: GroupMemberOption) => {
    setSelectedMembers((prev) => {
      if (candidate.id in prev) {
        return prev
      }

      return {
        ...prev,
        [candidate.id]: candidate,
      }
    })
  }

  const onAddFriend = () => {
    if (!friendCandidateId) {
      toast.error("Select a friend first")
      return
    }

    const candidate = data.friendCandidates.find(
      (entry) => entry.id === friendCandidateId
    )
    if (!candidate) {
      toast.error("Friend option is unavailable", {
        description: "Refresh and try again.",
      })
      return
    }

    if (candidate.id in selectedMembers) {
      toast.error("Member already selected")
      return
    }

    addSelectedMember(candidate)
    setFriendCandidateId("")
    toast.success(`${candidate.name} added`)
  }

  const onLookupByEmail = async () => {
    const email = emailQuery.trim().toLowerCase()
    if (!email) {
      toast.error("Email is required")
      return
    }

    setIsLookupPending(true)
    try {
      const result = await lookupGroupMemberByEmailFn({
        data: { email },
      })

      if (result.user.id in selectedMembers) {
        toast.error("Member already selected")
        return
      }

      addSelectedMember(result.user)
      setEmailQuery("")

      toast.success(
        result.alreadyFriend
          ? `${result.user.name} added from your friends`
          : `${result.user.name} added by email`
      )
    } catch (error) {
      toast.error("Could not find user", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      })
    } finally {
      setIsLookupPending(false)
    }
  }

  const onRemoveMember = (userId: string) => {
    setSelectedMembers((prev) => {
      const nextState = { ...prev }
      delete nextState[userId]
      return nextState
    })
  }

  const onCreateGroup = async () => {
    const trimmedName = name.trim()
    if (trimmedName.length < 2) {
      toast.error("Group name must be at least 2 characters.")
      return
    }

    setIsPending(true)
    try {
      const result = await createGroupFn({
        data: {
          name: trimmedName,
          memberUserIds: selectedMemberList.map((entry) => entry.id),
        },
      })

      toast.success("Group created", {
        description:
          result.memberCount > 1
            ? `${result.memberCount} members were added to the new group.`
            : "Start adding expenses in your new group.",
      })

      setCreateOpen(false)
      clearComposer()
      await navigate({
        to: "/groups/$groupId",
        params: { groupId: result.groupId },
      })
    } catch (error) {
      toast.error("Could not create group", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      })
    } finally {
      setIsPending(false)
    }
  }

  return (
    <DashboardShell
      title="Groups"
      headerActions={
        <div className="flex items-center gap-2">
          <Button
            type="button"
            className="h-10 rounded-xl"
            onClick={() => setCreateOpen(true)}
          >
            New group
          </Button>
        </div>
      }
    >
      <section className="mx-auto w-full max-w-3xl">
        <div className="space-y-2.5">
          {data.groups.length === 0 ? (
            <div className="dashboard-empty space-y-2.5">
              <p>No groups yet.</p>
              <Button
                type="button"
                className="h-10 rounded-xl"
                onClick={() => setCreateOpen(true)}
              >
                Create your first group
              </Button>
            </div>
          ) : (
            data.groups.map((group) => (
              <Link
                key={group.id}
                to="/groups/$groupId"
                params={{ groupId: group.id }}
                className="group block rounded-2xl border border-border/70 bg-background/85 px-3 py-3 transition-colors hover:border-primary/35 hover:bg-muted/40 sm:px-3.5 sm:py-3.5"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground sm:text-base">
                      {group.name}
                    </p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {group.memberCount} member
                      {group.memberCount === 1 ? "" : "s"}
                    </p>
                    <p
                      className={`mt-1 truncate text-xs font-medium ${getBalanceToneByNetMinor(group.netMinor)}`}
                    >
                      {group.netMinor === 0
                        ? "Balanced"
                        : group.netMinor > 0
                          ? `You get ${formatMoneyMinor(group.netMinor)}`
                          : `You owe ${formatMoneyMinor(Math.abs(group.netMinor))}`}
                    </p>
                  </div>
                  <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-border/70 bg-background/85 text-muted-foreground transition-colors group-hover:border-primary/40 group-hover:text-foreground">
                    <HugeiconsIcon
                      icon={ArrowRight01Icon}
                      className="size-4"
                      strokeWidth={1.7}
                    />
                  </span>
                </div>
              </Link>
            ))
          )}
        </div>
      </section>

      <CreateGroupModal
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
              onClick={onCreateGroup}
            >
              {isPending ? "Creating..." : "Create group"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4 sm:space-y-5">
          <section className="space-y-2 rounded-2xl border border-border/70 bg-background/75 p-3.5 sm:p-4">
            <Label className="text-sm font-medium text-foreground">
              Group name
            </Label>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Goa trip 2026"
              className="h-11 rounded-xl border-input/80 bg-background/75"
            />
            <p className="text-xs text-muted-foreground">
              Keep it short and recognizable for all members.
            </p>
          </section>

          <section className="space-y-3 rounded-2xl border border-border/70 bg-background/75 p-3.5 sm:p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-medium text-foreground">
                Add members
              </h3>
              <p className="text-xs text-muted-foreground">
                Optional at creation
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-muted-foreground">
                Add from friends
              </Label>
              <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                <Select
                  value={friendCandidateId}
                  onValueChange={(nextValue) =>
                    setFriendCandidateId(nextValue ?? "")
                  }
                  disabled={friendOptions.length === 0}
                >
                  <SelectTrigger className="h-11 rounded-xl border-input/80 bg-background/75">
                    <SelectValue
                      placeholder={
                        friendOptions.length > 0
                          ? "Choose a friend"
                          : "No available friends"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent align="start" sideOffset={6}>
                    {friendOptions.map((entry) => (
                      <SelectItem key={entry.id} value={entry.id}>
                        {entry.name} ({entry.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  type="button"
                  variant="outline"
                  className="h-11 rounded-xl px-4 sm:min-w-23"
                  disabled={!friendCandidateId}
                  onClick={onAddFriend}
                >
                  Add
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-muted-foreground">
                Search by email
              </Label>
              <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                <Input
                  value={emailQuery}
                  onChange={(event) => setEmailQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault()
                      void onLookupByEmail()
                    }
                  }}
                  placeholder="friend@example.com"
                  type="email"
                  className="h-11 rounded-xl border-input/80 bg-background/75"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 rounded-xl px-4 sm:min-w-23"
                  disabled={isLookupPending}
                  onClick={() => void onLookupByEmail()}
                >
                  {isLookupPending ? "Searching..." : "Search"}
                </Button>
              </div>
            </div>
          </section>

          <section className="space-y-2 rounded-2xl border border-border/70 bg-background/75 p-3.5 sm:p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">
                Selected members
              </p>
              <p className="text-xs text-muted-foreground">
                {selectedMemberList.length} selected
              </p>
            </div>

            {selectedMemberList.length === 0 ? (
              <p className="dashboard-empty text-sm">
                No additional members selected. You will be added automatically
                as owner.
              </p>
            ) : (
              <div className="space-y-2">
                {selectedMemberList.map((entry) => (
                  <div
                    key={entry.id}
                    className="dashboard-list-item flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {entry.name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {entry.email}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      className="shrink-0"
                      onClick={() => onRemoveMember(entry.id)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </CreateGroupModal>
    </DashboardShell>
  )
}
