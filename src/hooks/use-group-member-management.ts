import { useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"

import { authClient, getAuthErrorMessage } from "@/lib/auth-client"
import {
  invalidateOrganizationPeopleCache,
  listOrganizationInvitations,
  listOrganizationMembers,
} from "@/lib/organization-members-client"
import type {
  OrganizationInvitationRow,
  OrganizationMemberRow,
} from "@/lib/organization-members-client"

export type GroupMemberFriendCandidate = {
  id: string
  name: string
  email: string
}

export type GroupMemberManagementController = {
  members: Array<OrganizationMemberRow>
  invitations: Array<OrganizationInvitationRow>
  isLoading: boolean
  friendOptions: Array<GroupMemberFriendCandidate>
  selectedFriendCandidateIds: Array<string>
  selectedFriendCount: number
  emailQuery: string
  isAddingFriend: boolean
  isInvitingEmail: boolean
  removingMemberId: string
  cancellingInvitationId: string
  setEmailQuery: (value: string) => void
  handleFriendSelectionChange: (nextValue: unknown) => void
  handleFriendSelectOpenChange: (
    nextOpen: boolean,
    details: { cancel: () => void }
  ) => void
  onAddFriends: () => Promise<void>
  onAddByEmail: () => Promise<void>
  onRemoveMember: (entry: OrganizationMemberRow) => Promise<void>
  onCancelInvitation: (entry: OrganizationInvitationRow) => Promise<void>
}

type UseGroupMemberManagementOptions = {
  enabled: boolean
  groupId: string
  groupName: string
  friendCandidates: Array<GroupMemberFriendCandidate>
  isMobile: boolean
}

export function useGroupMemberManagement({
  enabled,
  groupId,
  groupName,
  friendCandidates,
  isMobile,
}: UseGroupMemberManagementOptions): GroupMemberManagementController {
  const [members, setMembers] = useState<Array<OrganizationMemberRow>>([])
  const [invitations, setInvitations] = useState<Array<OrganizationInvitationRow>>(
    []
  )
  const [isLoading, setIsLoading] = useState(false)
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
    if (!enabled) {
      setSelectedFriendCandidateIds([])
      setEmailQuery("")
      setIsAddingFriend(false)
      setIsInvitingEmail(false)
      setRemovingMemberId("")
      setCancellingInvitationId("")
      return
    }

    let isActive = true
    setIsLoading(true)

    void Promise.all([
      listOrganizationMembers(groupId),
      listOrganizationInvitations(groupId),
    ])
      .then(([nextMembers, nextInvitations]) => {
        if (!isActive) {
          return
        }

        setMembers(nextMembers)
        setInvitations(nextInvitations)
      })
      .catch((error) => {
        if (!isActive) {
          return
        }

        toast.error("Could not load members", {
          description: getAuthErrorMessage(error),
        })
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false)
        }
      })

    return () => {
      isActive = false
    }
  }, [enabled, groupId])

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
      friendCandidates.filter(
        (entry) =>
          !memberUserIds.has(entry.id) &&
          !pendingInvitationEmails.has(entry.email.toLowerCase())
      ),
    [friendCandidates, memberUserIds, pendingInvitationEmails]
  )

  const handleFriendSelectionChange = (nextValue: unknown) => {
    const selectedValues = Array.isArray(nextValue)
      ? nextValue.filter((value): value is string => typeof value === "string")
      : []
    setSelectedFriendCandidateIds(selectedValues)
    if (isMobile) {
      friendSelectCloseGuardUntilRef.current = Date.now() + 220
    }
  }

  const handleFriendSelectOpenChange = (
    nextOpen: boolean,
    details: { cancel: () => void }
  ) => {
    if (
      isMobile &&
      !nextOpen &&
      Date.now() < friendSelectCloseGuardUntilRef.current
    ) {
      details.cancel()
    }
  }

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
      const inviteResults = await Promise.all(
        candidates.map(async (candidate) => {
          try {
            const { error } = await authClient.organization.inviteMember({
              organizationId: groupId,
              email: candidate.email,
              role: "member",
            })

            return {
              candidate,
              succeeded: !error,
            }
          } catch {
            return {
              candidate,
              succeeded: false,
            }
          }
        })
      )

      const successCount = inviteResults.filter((entry) => entry.succeeded).length
      const failedNames = inviteResults
        .filter((entry) => !entry.succeeded)
        .map((entry) => entry.candidate.name)

      invalidateOrganizationPeopleCache(groupId)
      const nextInvitations = await listOrganizationInvitations(groupId, {
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
    const isConfirmed = window.confirm(`Remove ${entry.name} from ${groupName}?`)
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

  return {
    members,
    invitations,
    isLoading,
    friendOptions,
    selectedFriendCandidateIds,
    selectedFriendCount: selectedFriendCandidateIds.length,
    emailQuery,
    isAddingFriend,
    isInvitingEmail,
    removingMemberId,
    cancellingInvitationId,
    setEmailQuery,
    handleFriendSelectionChange,
    handleFriendSelectOpenChange,
    onAddFriends,
    onAddByEmail,
    onRemoveMember,
    onCancelInvitation,
  }
}
