import { Link, createFileRoute, useNavigate } from "@tanstack/react-router"
import { useServerFn } from "@tanstack/react-start"
import {
  ArrowLeft01Icon,
  Delete02Icon,
  Edit02Icon,
  HandHelpingIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import type {
  OrganizationInvitationRow,
  OrganizationMemberRow,
} from "@/lib/organization-members-client"

import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { useIsMobile } from "@/hooks/use-mobile"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { authClient, getAuthErrorMessage } from "@/lib/auth-client"
import { getGroupSettingsData, leaveGroup } from "@/lib/dashboard-server"
import {
  invalidateOrganizationPeopleCache,
  listOrganizationInvitations,
  listOrganizationMembers,
} from "@/lib/organization-members-client"

function formatDateLabel(value: Date) {
  return value.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export const Route = createFileRoute("/groups/$groupId/settings")({
  loader: ({ params }) =>
    getGroupSettingsData({ data: { groupId: params.groupId } }),
  head: () => ({
    meta: [
      {
        title: "Group Settings | Batwara",
      },
      {
        name: "robots",
        content: "noindex,nofollow",
      },
    ],
  }),
  component: GroupSettingsPage,
})

function GroupSettingsPage() {
  const data = Route.useLoaderData()
  const navigate = useNavigate()
  const leaveGroupFn = useServerFn(leaveGroup)
  const isMobile = useIsMobile()
  const [members, setMembers] = useState<Array<OrganizationMemberRow>>([])
  const [invitations, setInvitations] = useState<
    Array<OrganizationInvitationRow>
  >([])
  const [isLoading, setIsLoading] = useState(true)
  const [groupName, setGroupName] = useState(data.group.name)
  const [savedGroupName, setSavedGroupName] = useState(data.group.name)
  const [isUpdatingGroup, setIsUpdatingGroup] = useState(false)
  const [isDeletingGroup, setIsDeletingGroup] = useState(false)
  const [isLeavingGroup, setIsLeavingGroup] = useState(false)
  const [selectedFriendCandidateIds, setSelectedFriendCandidateIds] = useState<
    Array<string>
  >([])
  const [emailQuery, setEmailQuery] = useState("")
  const [isAddingFriend, setIsAddingFriend] = useState(false)
  const [isInvitingEmail, setIsInvitingEmail] = useState(false)
  const [removingMemberId, setRemovingMemberId] = useState("")
  const [cancellingInvitationId, setCancellingInvitationId] = useState("")
  const friendSelectCloseGuardUntilRef = useRef(0)

  useEffect(() => {
    let isActive = true

    const load = async () => {
      setIsLoading(true)
      try {
        const [nextMembers, nextInvitations] = await Promise.all([
          listOrganizationMembers(data.group.id),
          listOrganizationInvitations(data.group.id),
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

        toast.error("Could not load group settings", {
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
  }, [data.group.id])

  const memberUserIds = useMemo(
    () => new Set(members.map((entry) => entry.userId)),
    [members]
  )
  const pendingInvitationEmails = useMemo(
    () => new Set(invitations.map((entry) => entry.email.toLowerCase())),
    [invitations]
  )

  const friendOptions = useMemo(
    () =>
      data.friendCandidates.filter(
        (entry) =>
          !memberUserIds.has(entry.id) &&
          !pendingInvitationEmails.has(entry.email.toLowerCase())
      ),
    [data.friendCandidates, memberUserIds, pendingInvitationEmails]
  )
  const selectedFriendCount = selectedFriendCandidateIds.length
  const canEditGroupDetails =
    data.viewerRole === "owner" || data.viewerRole === "admin"
  const canDeleteGroup = data.viewerRole === "owner"
  const canLeaveGroup = data.viewerRole !== "owner"
  const normalizedGroupName = groupName.trim()
  const hasGroupNameChanges = normalizedGroupName !== savedGroupName

  const onAddFriends = async () => {
    if (selectedFriendCandidateIds.length === 0) {
      toast.error("Select at least one friend")
      return
    }

    const candidates = friendOptions.filter((entry) =>
      selectedFriendCandidateIds.includes(entry.id)
    )
    if (candidates.length === 0) {
      toast.error("Selected friends are unavailable", {
        description: "Refresh and try again.",
      })
      return
    }

    setIsAddingFriend(true)
    try {
      let successCount = 0
      const failedNames: Array<string> = []

      for (const candidate of candidates) {
        const { error } = await authClient.organization.inviteMember({
          organizationId: data.group.id,
          email: candidate.email,
          role: "member",
        })

        if (error) {
          failedNames.push(candidate.name)
          continue
        }

        successCount += 1
      }

      invalidateOrganizationPeopleCache(data.group.id)
      const nextInvitations = await listOrganizationInvitations(data.group.id, {
        force: true,
      })
      setInvitations(nextInvitations)
      setSelectedFriendCandidateIds([])

      if (successCount > 0) {
        toast.success(
          successCount === 1
            ? `Invitation sent to ${candidates[0]?.name ?? "friend"}`
            : `${successCount} invitations sent`
        )
      }

      if (failedNames.length > 0) {
        toast.error("Some invitations could not be sent", {
          description:
            failedNames.length <= 3
              ? failedNames.join(", ")
              : `${failedNames.slice(0, 3).join(", ")} +${failedNames.length - 3} more`,
        })
      }
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
        organizationId: data.group.id,
        email,
        role: "member",
      })

      if (error) {
        toast.error("Could not send invitation", {
          description: getAuthErrorMessage(error),
        })
        return
      }

      invalidateOrganizationPeopleCache(data.group.id)
      const nextInvitations = await listOrganizationInvitations(data.group.id, {
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
      `Remove ${entry.name} from ${data.group.name}?`
    )
    if (!isConfirmed) {
      return
    }

    setRemovingMemberId(entry.memberId)
    try {
      const { error } = await authClient.organization.removeMember({
        organizationId: data.group.id,
        memberIdOrEmail: entry.memberId,
      })

      if (error) {
        toast.error("Could not remove member", {
          description: getAuthErrorMessage(error),
        })
        return
      }

      invalidateOrganizationPeopleCache(data.group.id)
      const nextMembers = await listOrganizationMembers(data.group.id, {
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

      invalidateOrganizationPeopleCache(data.group.id)
      const nextInvitations = await listOrganizationInvitations(data.group.id, {
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

  useEffect(() => {
    setGroupName(data.group.name)
    setSavedGroupName(data.group.name)
  }, [data.group.name])

  const onUpdateGroupDetails = async () => {
    if (!canEditGroupDetails) {
      toast.error("You cannot edit group details")
      return
    }

    if (normalizedGroupName.length < 2) {
      toast.error("Group name must be at least 2 characters.")
      return
    }

    if (!hasGroupNameChanges) {
      return
    }

    setIsUpdatingGroup(true)
    try {
      const { error } = await authClient.organization.update({
        organizationId: data.group.id,
        data: {
          name: normalizedGroupName,
        },
      })

      if (error) {
        toast.error("Could not update group details", {
          description: getAuthErrorMessage(error),
        })
        return
      }

      setGroupName(normalizedGroupName)
      setSavedGroupName(normalizedGroupName)
      toast.success("Group details updated")
    } catch (error) {
      toast.error("Could not update group details", {
        description: getAuthErrorMessage(error),
      })
    } finally {
      setIsUpdatingGroup(false)
    }
  }

  const onDeleteGroup = async () => {
    if (!canDeleteGroup) {
      toast.error("Only the group owner can delete this group.")
      return
    }

    const isConfirmed = window.confirm(
      `Delete ${data.group.name}? This permanently removes the group ledger and all group history.`
    )
    if (!isConfirmed) {
      return
    }

    setIsDeletingGroup(true)
    try {
      const { error } = await authClient.organization.delete({
        organizationId: data.group.id,
      })

      if (error) {
        toast.error("Could not delete group", {
          description: getAuthErrorMessage(error),
        })
        return
      }

      toast.success("Group deleted")
      await navigate({ to: "/groups" })
    } catch (error) {
      toast.error("Could not delete group", {
        description: getAuthErrorMessage(error),
      })
    } finally {
      setIsDeletingGroup(false)
    }
  }

  const onLeaveGroup = async () => {
    if (!canLeaveGroup) {
      toast.error("Group owners cannot leave the group.")
      return
    }

    const isConfirmed = window.confirm(
      `Leave ${data.group.name}? Past transactions stay in group history, and you won't be included in future splits.`
    )
    if (!isConfirmed) {
      return
    }

    setIsLeavingGroup(true)
    try {
      await leaveGroupFn({
        data: { groupId: data.group.id },
      })
      toast.success("You left the group.")
      await navigate({ to: "/groups" })
    } catch (error) {
      toast.error("Could not leave group", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      })
    } finally {
      setIsLeavingGroup(false)
    }
  }

  return (
    <DashboardShell
      title="Group details"
      description="Edit group details, manage members, and control access."
      headerActions={
        <div className="flex items-center gap-2">
          <Link
            to="/groups/$groupId"
            params={{ groupId: data.group.id }}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border bg-background px-3 text-sm hover:bg-muted/60"
          >
            <HugeiconsIcon
              icon={ArrowLeft01Icon}
              className="size-3.5"
              strokeWidth={1.7}
            />
            Group
          </Link>
        </div>
      }
    >
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
          <div className="dashboard-pill">Your role: {data.viewerRole}</div>
        </div>

        <div className="space-y-3 rounded-2xl border border-border/70 bg-background/70 p-4">
          <div className="flex items-center gap-2">
            <HugeiconsIcon
              icon={Edit02Icon}
              className="size-4"
              strokeWidth={1.7}
            />
            <h2 className="font-heading text-lg">Edit group details</h2>
          </div>
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Group name</Label>
              <Input
                value={groupName}
                onChange={(event) => setGroupName(event.target.value)}
                className="h-11 rounded-xl border-input/80 bg-background/80"
                disabled={!canEditGroupDetails || isUpdatingGroup}
              />
              {!canEditGroupDetails ? (
                <p className="text-xs text-muted-foreground">
                  Only owners and admins can edit group details.
                </p>
              ) : null}
            </div>
            <Button
              type="button"
              onClick={onUpdateGroupDetails}
              disabled={
                !canEditGroupDetails ||
                !hasGroupNameChanges ||
                normalizedGroupName.length < 2 ||
                isUpdatingGroup
              }
              className="h-10 rounded-xl"
            >
              {isUpdatingGroup ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>

        {data.canManageMembers ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2.5 rounded-2xl border border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(248,245,238,0.88))] p-4">
              <Label className="text-sm font-medium">Add from friends</Label>
              <Select
                multiple
                value={selectedFriendCandidateIds}
                onValueChange={(nextValue) => {
                  const selectedValues = Array.isArray(nextValue)
                    ? nextValue.filter(
                        (value): value is string => typeof value === "string"
                      )
                    : []
                  setSelectedFriendCandidateIds(selectedValues)
                  if (isMobile) {
                    friendSelectCloseGuardUntilRef.current = Date.now() + 220
                  }
                }}
                onOpenChange={(nextOpen, details) => {
                  if (
                    isMobile &&
                    !nextOpen &&
                    Date.now() < friendSelectCloseGuardUntilRef.current
                  ) {
                    details.cancel()
                  }
                }}
                disabled={friendOptions.length === 0 || isAddingFriend}
              >
                <SelectTrigger className="min-h-11 w-full rounded-xl border-input/80 bg-background/85">
                  <SelectValue
                    placeholder={
                      friendOptions.length > 0
                        ? "Select friend members"
                        : "No eligible friends left"
                    }
                  >
                    {(value) => {
                      const selectedValues = Array.isArray(value)
                        ? value.filter(
                            (entry): entry is string =>
                              typeof entry === "string"
                          )
                        : []
                      if (selectedValues.length === 0) {
                        return "Select friend members"
                      }

                      const selectedNames = friendOptions
                        .filter((entry) => selectedValues.includes(entry.id))
                        .map((entry) => entry.name)

                      if (selectedNames.length <= 2) {
                        return selectedNames.join(", ")
                      }

                      return `${selectedNames.slice(0, 2).join(", ")} +${selectedNames.length - 2}`
                    }}
                  </SelectValue>
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
              <p className="text-xs text-muted-foreground">
                {selectedFriendCount} selected
              </p>
              <Button
                type="button"
                onClick={onAddFriends}
                disabled={selectedFriendCount === 0 || isAddingFriend}
                className="h-10 rounded-xl"
              >
                {isAddingFriend
                  ? "Sending..."
                  : selectedFriendCount > 1
                    ? `Invite ${selectedFriendCount} friends`
                    : "Invite selected friend"}
              </Button>
            </div>

            <div className="space-y-2.5 rounded-2xl border border-border/70 bg-background/70 p-4">
              <Label className="text-sm font-medium">Add by email</Label>
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

      <section className="dashboard-surface mt-4">
        <h2 className="font-heading text-xl">Current members</h2>
        <div className="mt-3 space-y-2">
          {isLoading ? (
            <p className="rounded-xl border border-dashed border-border px-3 py-5 text-sm text-muted-foreground">
              Loading members...
            </p>
          ) : null}
          {members.map((entry) => {
            const canRemove = data.canManageMembers && entry.role !== "owner"

            return (
              <div
                key={entry.memberId}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/70 px-3 py-3"
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

      <section className="dashboard-surface mt-4">
        <h2 className="font-heading text-xl">Pending invitations</h2>
        <div className="mt-3 space-y-2">
          {isLoading ? (
            <p className="rounded-xl border border-dashed border-border px-3 py-5 text-sm text-muted-foreground">
              Loading invitations...
            </p>
          ) : invitations.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-3 py-5 text-sm text-muted-foreground">
              No pending invitations.
            </p>
          ) : (
            invitations.map((entry) => (
              <div
                key={entry.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/70 px-3 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {entry.email}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {entry.role} · sent {formatDateLabel(entry.createdAt)}
                  </p>
                </div>
                {data.canManageMembers ? (
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

      {canLeaveGroup ? (
        <section className="mt-4 rounded-2xl border border-border/80 bg-background/95 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-heading text-lg text-foreground">Leave group</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Past transactions stay unchanged. You won't be included in new
                expenses or settlements.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="h-9 rounded-xl"
              disabled={isLeavingGroup}
              onClick={onLeaveGroup}
            >
              {isLeavingGroup ? "Leaving..." : "Leave group"}
            </Button>
          </div>
        </section>
      ) : null}

      <section className="mt-4 rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <HugeiconsIcon
                icon={Delete02Icon}
                className="size-4 text-destructive"
                strokeWidth={1.7}
              />
              <h2 className="font-heading text-lg text-foreground">
                Delete group
              </h2>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              This removes the group and its ledger history for all members.
            </p>
          </div>
          <Button
            type="button"
            variant="destructive"
            className="h-9 rounded-xl"
            disabled={!canDeleteGroup || isDeletingGroup}
            onClick={onDeleteGroup}
          >
            {isDeletingGroup ? "Deleting..." : "Delete group"}
          </Button>
        </div>
        {!canDeleteGroup ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Only the group owner can delete this group.
          </p>
        ) : null}
      </section>
    </DashboardShell>
  )
}
