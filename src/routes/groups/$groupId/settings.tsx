import { Link, createFileRoute, useNavigate } from "@tanstack/react-router"
import { useServerFn } from "@tanstack/react-start"
import {
  ArrowLeft01Icon,
  Delete02Icon,
  Edit02Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useEffect, useState } from "react"
import { toast } from "sonner"

import { GroupMemberManagementPanel } from "@/components/groups/group-member-management-panel"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { useGroupMemberManagement } from "@/hooks/use-group-member-management"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { authClient, getAuthErrorMessage } from "@/lib/auth-client"
import { getGroupSettingsData, leaveGroup } from "@/lib/dashboard-server"

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
  const [groupName, setGroupName] = useState(data.group.name)
  const [savedGroupName, setSavedGroupName] = useState(data.group.name)
  const [isUpdatingGroup, setIsUpdatingGroup] = useState(false)
  const [isDeletingGroup, setIsDeletingGroup] = useState(false)
  const [isLeavingGroup, setIsLeavingGroup] = useState(false)
  const canEditGroupDetails =
    data.viewerRole === "owner" || data.viewerRole === "admin"
  const canDeleteGroup = data.viewerRole === "owner"
  const canLeaveGroup = data.viewerRole !== "owner"
  const normalizedGroupName = groupName.trim()
  const hasGroupNameChanges = normalizedGroupName !== savedGroupName
  const memberManagement = useGroupMemberManagement({
    enabled: true,
    groupId: data.group.id,
    groupName: data.group.name,
    friendCandidates: data.friendCandidates,
    isMobile: false,
  })

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
      </section>
      <GroupMemberManagementPanel
        variant="page"
        viewerRole={data.viewerRole}
        canManageMembers={data.canManageMembers}
        isMobile={false}
        controller={memberManagement}
      />

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
