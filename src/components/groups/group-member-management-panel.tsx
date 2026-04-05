import { HandHelpingIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import type { GroupMemberManagementController } from "@/hooks/use-group-member-management"
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

type GroupMemberManagementPanelProps = {
  variant: "page" | "modal"
  viewerRole: string
  canManageMembers: boolean
  isMobile: boolean
  controller: GroupMemberManagementController
}

function formatDateLabel(value: Date) {
  return value.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function getSelectedFriendSummary(
  selectedIds: Array<string>,
  friendOptions: GroupMemberManagementController["friendOptions"]
) {
  if (selectedIds.length === 0) {
    return "Select friend members"
  }

  const selectedNames = friendOptions
    .filter((entry) => selectedIds.includes(entry.id))
    .map((entry) => entry.name)

  if (selectedNames.length <= 2) {
    return selectedNames.join(", ")
  }

  return `${selectedNames.slice(0, 2).join(", ")} +${selectedNames.length - 2}`
}

export function GroupMemberManagementPanel({
  variant,
  viewerRole,
  canManageMembers,
  isMobile,
  controller,
}: GroupMemberManagementPanelProps) {
  const sectionClassName =
    variant === "modal" ? "dashboard-surface" : "dashboard-surface mt-4"
  const inviteGridClassName =
    variant === "modal"
      ? "grid gap-3 md:grid-cols-2"
      : "grid gap-4 lg:grid-cols-2"
  const addFriendsCardClassName =
    variant === "modal"
      ? "space-y-2.5 rounded-2xl border border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(248,245,238,0.88))] p-3.5"
      : "space-y-2.5 rounded-2xl border border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(248,245,238,0.88))] p-4"
  const addEmailCardClassName =
    variant === "modal"
      ? "space-y-2.5 rounded-2xl border border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(248,245,238,0.88))] p-3.5"
      : "space-y-2.5 rounded-2xl border border-border/70 bg-background/70 p-4"
  const listItemClassName =
    variant === "modal"
      ? "dashboard-list-item flex flex-wrap items-center justify-between gap-2"
      : "flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/70 px-3 py-3"
  const emptyClassName =
    variant === "modal"
      ? "dashboard-empty"
      : "rounded-xl border border-dashed border-border px-3 py-5 text-sm text-muted-foreground"

  return (
    <div className="space-y-4">
      <section className="dashboard-surface space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="dashboard-pill">
            <HugeiconsIcon
              icon={HandHelpingIcon}
              className="mr-1.5 size-3.5"
              strokeWidth={1.7}
            />
            {controller.members.length} members
          </div>
          <div className="dashboard-pill">
            {controller.invitations.length} pending invites
          </div>
          <div className="dashboard-pill">Your role: {viewerRole}</div>
        </div>

        {canManageMembers ? (
          <div className={inviteGridClassName}>
            <div className={addFriendsCardClassName}>
              <Label className="text-sm font-medium">Add from friends</Label>
              <Select
                multiple
                modal={variant === "modal" ? !isMobile : undefined}
                value={controller.selectedFriendCandidateIds}
                onValueChange={controller.handleFriendSelectionChange}
                onOpenChange={controller.handleFriendSelectOpenChange}
                disabled={
                  controller.friendOptions.length === 0 ||
                  controller.isAddingFriend
                }
              >
                <SelectTrigger className="min-h-11 w-full rounded-xl border-input/80 bg-background/85">
                  <SelectValue
                    placeholder={
                      controller.friendOptions.length > 0
                        ? "Select friend members"
                        : "No eligible friends left"
                    }
                  >
                    {() =>
                      getSelectedFriendSummary(
                        controller.selectedFriendCandidateIds,
                        controller.friendOptions
                      )
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent align="start" sideOffset={6}>
                  {controller.friendOptions.length === 0 ? (
                    <SelectItem value="none" disabled>
                      No eligible friends left
                    </SelectItem>
                  ) : (
                    controller.friendOptions.map((entry) => (
                      <SelectItem key={entry.id} value={entry.id}>
                        {entry.name} - {entry.email}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {controller.selectedFriendCount} selected
              </p>
              <Button
                type="button"
                onClick={() => void controller.onAddFriends()}
                disabled={
                  controller.selectedFriendCount === 0 ||
                  controller.isAddingFriend
                }
                className="h-10 rounded-xl"
              >
                {controller.isAddingFriend
                  ? "Sending..."
                  : controller.selectedFriendCount > 1
                    ? `Invite ${controller.selectedFriendCount} friends`
                    : "Invite selected friend"}
              </Button>
            </div>

            <div className={addEmailCardClassName}>
              <Label className="text-sm font-medium">
                {variant === "modal" ? "Invite by email" : "Add by email"}
              </Label>
              <Input
                value={controller.emailQuery}
                onChange={(event) =>
                  controller.setEmailQuery(event.target.value)
                }
                placeholder="friend@example.com"
                className="h-11 rounded-xl border-input/80 bg-background/80"
              />
              <Button
                type="button"
                onClick={() => void controller.onAddByEmail()}
                disabled={controller.isInvitingEmail}
                className="h-10 rounded-xl"
              >
                {controller.isInvitingEmail ? "Sending..." : "Send invitation"}
              </Button>
            </div>
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-border px-4 py-4 text-sm text-muted-foreground">
            Only owners and admins can add or remove members.
          </p>
        )}
      </section>

      <section className={sectionClassName}>
        <h2 className="font-heading text-xl">Current members</h2>
        <div className="mt-3 space-y-2">
          {controller.isLoading ? (
            <p className={emptyClassName}>Loading members...</p>
          ) : null}
          {controller.members.map((entry) => {
            const canRemove = canManageMembers && entry.role !== "owner"

            return (
              <div key={entry.memberId} className={listItemClassName}>
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
                      disabled={controller.removingMemberId === entry.memberId}
                      onClick={() => void controller.onRemoveMember(entry)}
                    >
                      {controller.removingMemberId === entry.memberId
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

      <section className={sectionClassName}>
        <h2 className="font-heading text-xl">Pending invitations</h2>
        <div className="mt-3 space-y-2">
          {controller.isLoading ? (
            <p className={emptyClassName}>Loading invitations...</p>
          ) : controller.invitations.length === 0 ? (
            <p className={emptyClassName}>No pending invitations.</p>
          ) : (
            controller.invitations.map((entry) => (
              <div key={entry.id} className={listItemClassName}>
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
                    disabled={controller.cancellingInvitationId === entry.id}
                    onClick={() => void controller.onCancelInvitation(entry)}
                  >
                    {controller.cancellingInvitationId === entry.id
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
}
