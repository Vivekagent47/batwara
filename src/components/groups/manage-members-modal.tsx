import { HandHelpingIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import type {
  OrganizationInvitationRow,
  OrganizationMemberRow,
} from "@/lib/organization-members-client"

import { useIsMobile } from "@/hooks/use-mobile"
import { authClient, getAuthErrorMessage } from "@/lib/auth-client"
import {
  invalidateOrganizationPeopleCache,
  listOrganizationInvitations,
  listOrganizationMembers,
} from "@/lib/organization-members-client"
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

type FriendCandidate = {
  id: string
  name: string
  email: string
}

type ManageMembersModalProps = {
  open: boolean
  onOpenChange: (nextOpen: boolean) => void
  groupId: string
  groupName: string
  canManageMembers: boolean
  viewerRole: string
  friendCandidates: Array<FriendCandidate>
}

function formatDateLabel(value: Date) {
  return value.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function ManageMembersModal({
  open,
  onOpenChange,
  groupId,
  groupName,
  canManageMembers,
  viewerRole,
  friendCandidates,
}: ManageMembersModalProps) {
  const isMobile = useIsMobile()
  const [members, setMembers] = useState<Array<OrganizationMemberRow>>([])
  const [invitations, setInvitations] = useState<
    Array<OrganizationInvitationRow>
  >([])
  const [isLoading, setIsLoading] = useState(false)
  const [friendCandidateId, setFriendCandidateId] = useState("")
  const [emailQuery, setEmailQuery] = useState("")
  const [isAddingFriend, setIsAddingFriend] = useState(false)
  const [isInvitingEmail, setIsInvitingEmail] = useState(false)
  const [removingMemberId, setRemovingMemberId] = useState("")
  const [cancellingInvitationId, setCancellingInvitationId] = useState("")

  useEffect(() => {
    if (!open) {
      return
    }

    let isActive = true

    const load = async () => {
      setIsLoading(true)
      try {
        const [nextMembers, nextInvitations] = await Promise.all([
          listOrganizationMembers(groupId),
          listOrganizationInvitations(groupId),
        ])

        if (!isActive) {
          return
        }

        setMembers(nextMembers)
        setInvitations(nextInvitations)
      } catch (error) {
        if (!isActive) {
          return
        }

        toast.error("Could not load members", {
          description: getAuthErrorMessage(error),
        })
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }

    void load()

    return () => {
      isActive = false
    }
  }, [groupId, open])

  useEffect(() => {
    if (open) {
      return
    }

    setFriendCandidateId("")
    setEmailQuery("")
    setIsAddingFriend(false)
    setIsInvitingEmail(false)
    setRemovingMemberId("")
    setCancellingInvitationId("")
  }, [open])

  const memberUserIds = useMemo(
    () => new Set(members.map((entry) => entry.userId)),
    [members]
  )

  const friendOptions = useMemo(
    () => friendCandidates.filter((entry) => !memberUserIds.has(entry.id)),
    [friendCandidates, memberUserIds]
  )

  const onAddFriend = async () => {
    if (!friendCandidateId) {
      toast.error("Select a friend first")
      return
    }

    const candidate = friendOptions.find(
      (entry) => entry.id === friendCandidateId
    )
    if (!candidate) {
      toast.error("Friend option is unavailable", {
        description: "Refresh and try again.",
      })
      return
    }

    setIsAddingFriend(true)
    try {
      const { error } = await authClient.organization.inviteMember({
        organizationId: groupId,
        email: candidate.email,
        role: "member",
      })

      if (error) {
        toast.error("Could not add member", {
          description: getAuthErrorMessage(error),
        })
        return
      }

      invalidateOrganizationPeopleCache(groupId)
      const nextInvitations = await listOrganizationInvitations(groupId, {
        force: true,
      })
      setInvitations(nextInvitations)
      setFriendCandidateId("")
      toast.success(`Invitation sent to ${candidate.name}`)
    } catch (error) {
      toast.error("Could not add member", {
        description: getAuthErrorMessage(error),
      })
    } finally {
      setIsAddingFriend(false)
    }
  }

  const onAddByEmail = async () => {
    const email = emailQuery.trim().toLowerCase()
    if (!email) {
      toast.error("Email is required")
      return
    }

    setIsInvitingEmail(true)
    try {
      const { error } = await authClient.organization.inviteMember({
        organizationId: groupId,
        email,
        role: "member",
      })

      if (error) {
        toast.error("Could not send invitation", {
          description: getAuthErrorMessage(error),
        })
        return
      }

      invalidateOrganizationPeopleCache(groupId)
      const nextInvitations = await listOrganizationInvitations(groupId, {
        force: true,
      })
      setInvitations(nextInvitations)
      setEmailQuery("")
      toast.success("Invitation sent")
    } catch (error) {
      toast.error("Could not send invitation", {
        description: getAuthErrorMessage(error),
      })
    } finally {
      setIsInvitingEmail(false)
    }
  }

  const onRemoveMember = async (entry: OrganizationMemberRow) => {
    const isConfirmed = window.confirm(
      `Remove ${entry.name} from ${groupName}?`
    )
    if (!isConfirmed) {
      return
    }

    setRemovingMemberId(entry.memberId)
    try {
      const { error } = await authClient.organization.removeMember({
        organizationId: groupId,
        memberIdOrEmail: entry.memberId,
      })

      if (error) {
        toast.error("Could not remove member", {
          description: getAuthErrorMessage(error),
        })
        return
      }

      invalidateOrganizationPeopleCache(groupId)
      const nextMembers = await listOrganizationMembers(groupId, {
        force: true,
      })
      setMembers(nextMembers)
      toast.success(`${entry.name} removed`)
    } catch (error) {
      toast.error("Could not remove member", {
        description: getAuthErrorMessage(error),
      })
    } finally {
      setRemovingMemberId("")
    }
  }

  const onCancelInvitation = async (entry: OrganizationInvitationRow) => {
    setCancellingInvitationId(entry.id)
    try {
      const { error } = await authClient.organization.cancelInvitation({
        invitationId: entry.id,
      })

      if (error) {
        toast.error("Could not cancel invitation", {
          description: getAuthErrorMessage(error),
        })
        return
      }

      invalidateOrganizationPeopleCache(groupId)
      const nextInvitations = await listOrganizationInvitations(groupId, {
        force: true,
      })
      setInvitations(nextInvitations)
      toast.success(`Invitation canceled for ${entry.email}`)
    } catch (error) {
      toast.error("Could not cancel invitation", {
        description: getAuthErrorMessage(error),
      })
    } finally {
      setCancellingInvitationId("")
    }
  }

  const modalBody = (
    <div className="space-y-4">
      <section className="dashboard-surface space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="dashboard-pill">
            <HugeiconsIcon
              icon={HandHelpingIcon}
              className="mr-1.5 size-3.5"
              strokeWidth={1.7}
            />
            {members.length} members
          </div>
          <div className="dashboard-pill">
            {invitations.length} pending invites
          </div>
          <div className="dashboard-pill">Your role: {viewerRole}</div>
        </div>

        {canManageMembers ? (
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2.5 rounded-2xl border border-border/70 bg-background/70 p-3">
              <Label className="text-sm font-medium">Add from friends</Label>
              <Select
                value={friendCandidateId}
                onValueChange={(nextValue) =>
                  setFriendCandidateId(nextValue ?? "")
                }
              >
                <SelectTrigger className="h-11 rounded-xl border-input/80 bg-background/80">
                  <SelectValue placeholder="Select a friend" />
                </SelectTrigger>
                <SelectContent align="start" sideOffset={6}>
                  {friendOptions.length === 0 ? (
                    <SelectItem value="none" disabled>
                      No eligible friends left
                    </SelectItem>
                  ) : (
                    friendOptions.map((entry) => (
                      <SelectItem key={entry.id} value={entry.id}>
                        {entry.name} - {entry.email}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <Button
                type="button"
                onClick={onAddFriend}
                disabled={!friendCandidateId || isAddingFriend}
                className="h-10 rounded-xl"
              >
                {isAddingFriend ? "Adding..." : "Add friend"}
              </Button>
            </div>

            <div className="space-y-2.5 rounded-2xl border border-border/70 bg-background/70 p-3">
              <Label className="text-sm font-medium">Invite by email</Label>
              <Input
                value={emailQuery}
                onChange={(event) => setEmailQuery(event.target.value)}
                placeholder="friend@example.com"
                className="h-11 rounded-xl border-input/80 bg-background/80"
              />
              <Button
                type="button"
                onClick={onAddByEmail}
                disabled={isInvitingEmail}
                className="h-10 rounded-xl"
              >
                {isInvitingEmail ? "Sending..." : "Send invitation"}
              </Button>
            </div>
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-border px-4 py-4 text-sm text-muted-foreground">
            Only owners and admins can add or remove members.
          </p>
        )}
      </section>

      <section className="dashboard-surface">
        <h2 className="font-heading text-xl">Current members</h2>
        <div className="mt-3 space-y-2">
          {isLoading ? (
            <p className="dashboard-empty">Loading members...</p>
          ) : null}
          {members.map((entry) => {
            const canRemove = canManageMembers && entry.role !== "owner"

            return (
              <div
                key={entry.memberId}
                className="dashboard-list-item flex flex-wrap items-center justify-between gap-2"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {entry.name}
                  </p>
                  <p className="text-xs text-muted-foreground">{entry.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-border/70 bg-background px-2.5 py-1 text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase">
                    {entry.role}
                  </span>
                  {canRemove ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 rounded-lg"
                      disabled={removingMemberId === entry.memberId}
                      onClick={() => onRemoveMember(entry)}
                    >
                      {removingMemberId === entry.memberId
                        ? "Removing..."
                        : "Remove"}
                    </Button>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section className="dashboard-surface">
        <h2 className="font-heading text-xl">Pending invitations</h2>
        <div className="mt-3 space-y-2">
          {isLoading ? (
            <p className="dashboard-empty">Loading invitations...</p>
          ) : invitations.length === 0 ? (
            <p className="dashboard-empty">No pending invitations.</p>
          ) : (
            invitations.map((entry) => (
              <div
                key={entry.id}
                className="dashboard-list-item flex flex-wrap items-center justify-between gap-2"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {entry.email}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {entry.role} · sent {formatDateLabel(entry.createdAt)}
                  </p>
                </div>
                {canManageMembers ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-lg"
                    disabled={cancellingInvitationId === entry.id}
                    onClick={() => onCancelInvitation(entry)}
                  >
                    {cancellingInvitationId === entry.id
                      ? "Canceling..."
                      : "Cancel"}
                  </Button>
                ) : null}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  )

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[92svh] rounded-t-3xl border-border/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(247,244,236,0.95))]">
          <DrawerHeader className="items-start px-4 pb-2 text-left">
            <DrawerTitle className="text-xl">Manage members</DrawerTitle>
            <DrawerDescription>
              Invite, remove, and track pending members for {groupName}.
            </DrawerDescription>
          </DrawerHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-2">
            {modalBody}
          </div>
          <DrawerFooter className="border-t border-border/70 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.9rem)]">
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-xl"
              onClick={() => onOpenChange(false)}
            >
              Done
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-3xl gap-0 rounded-3xl border border-border/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(247,244,236,0.94))] p-0 shadow-[0_24px_56px_rgba(24,30,23,0.18)]"
        showCloseButton
      >
        <DialogHeader className="border-b border-border/70 px-6 py-5">
          <DialogTitle className="text-2xl">Manage members</DialogTitle>
          <DialogDescription>
            Invite, remove, and track pending members for {groupName}.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[72vh] overflow-y-auto px-6 py-4">
          {modalBody}
        </div>
        <DialogFooter className="border-t border-border/70 px-6 py-4">
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-xl"
            onClick={() => onOpenChange(false)}
          >
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
