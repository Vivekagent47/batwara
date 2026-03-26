import { Link, createFileRoute } from "@tanstack/react-router"
import { HandHelpingIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import type {
  OrganizationInvitationRow,
  OrganizationMemberRow,
} from "@/lib/organization-members-client"

import { DashboardShell } from "@/components/dashboard/dashboard-shell"
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
import { getGroupSettingsData } from "@/lib/dashboard-server"
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
  loader: async ({ params }) =>
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
  const [members, setMembers] = useState<Array<OrganizationMemberRow>>([])
  const [invitations, setInvitations] = useState<Array<OrganizationInvitationRow>>([])
  const [isLoading, setIsLoading] = useState(true)
  const [friendCandidateId, setFriendCandidateId] = useState("")
  const [emailQuery, setEmailQuery] = useState("")
  const [isAddingFriend, setIsAddingFriend] = useState(false)
  const [isInvitingEmail, setIsInvitingEmail] = useState(false)
  const [removingMemberId, setRemovingMemberId] = useState("")
  const [cancellingInvitationId, setCancellingInvitationId] = useState("")

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

  const friendOptions = useMemo(
    () => data.friendCandidates.filter((entry) => !memberUserIds.has(entry.id)),
    [data.friendCandidates, memberUserIds]
  )

  const onAddFriend = async () => {
    if (!friendCandidateId) {
      toast.error("Select a friend first")
      return
    }

    const candidate = friendOptions.find((entry) => entry.id === friendCandidateId)
    if (!candidate) {
      toast.error("Friend option is unavailable", {
        description: "Refresh and try again.",
      })
      return
    }

    setIsAddingFriend(true)
    try {
      const { error } = await authClient.organization.inviteMember({
        organizationId: data.group.id,
        email: candidate.email,
        role: "member",
      })

      if (error) {
        toast.error("Could not add member", {
          description: getAuthErrorMessage(error),
        })
        return
      }

      invalidateOrganizationPeopleCache(data.group.id)
      const nextInvitations = await listOrganizationInvitations(data.group.id, {
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

  return (
    <DashboardShell
      title={`${data.group.name} settings`}
      description="Manage group members and keep the ledger participants accurate."
      headerActions={
        <div className="flex items-center gap-2">
          <Link
            to="/groups/$groupId"
            params={{ groupId: data.group.id }}
            className="inline-flex h-10 items-center rounded-xl border border-border bg-background px-4 text-sm hover:bg-muted/60"
          >
            Back to group
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
          <div className="dashboard-pill">{invitations.length} pending invites</div>
          <div className="dashboard-pill">
            Your role: {data.viewerRole}
          </div>
        </div>

        {data.canManageMembers ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2.5 rounded-2xl border border-border/70 bg-background/70 p-4">
              <Label className="text-sm font-medium">Add from friends</Label>
              <Select
                value={friendCandidateId}
                onValueChange={(nextValue) => setFriendCandidateId(nextValue ?? "")}
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
                {isAddingFriend ? "Adding..." : "Add friend to group"}
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

      <section className="mt-4 dashboard-surface">
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
                  <span className="rounded-full border border-border/70 bg-background px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
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

      <section className="mt-4 dashboard-surface">
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
    </DashboardShell>
  )
}
