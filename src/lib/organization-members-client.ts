import { QueryClient } from "@tanstack/react-query"

import { authClient, getAuthErrorMessage } from "@/lib/auth-client"

export type OrganizationMemberRow = {
  memberId: string
  userId: string
  name: string
  email: string
  role: string
}

export type OrganizationInvitationRow = {
  id: string
  email: string
  role: string
  createdAt: Date
}

const PEOPLE_QUERY_KEY = "organization-people"
const PEOPLE_QUERY_STALE_TIME_MS = 15_000
const PEOPLE_QUERY_GC_TIME_MS = 5 * 60_000

const organizationPeopleQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: PEOPLE_QUERY_STALE_TIME_MS,
      gcTime: PEOPLE_QUERY_GC_TIME_MS,
      retry: 1,
    },
  },
})

function membersQueryKey(organizationId: string) {
  return [PEOPLE_QUERY_KEY, organizationId, "members"] as const
}

function invitationsQueryKey(organizationId: string) {
  return [PEOPLE_QUERY_KEY, organizationId, "invitations"] as const
}

function organizationPeopleQueryKey(organizationId: string) {
  return [PEOPLE_QUERY_KEY, organizationId] as const
}

function sortMembers(rows: Array<OrganizationMemberRow>) {
  return [...rows].sort((a, b) => {
    if (a.role === b.role) {
      return a.name.localeCompare(b.name)
    }

    if (a.role === "owner") {
      return -1
    }

    if (b.role === "owner") {
      return 1
    }

    return a.role.localeCompare(b.role)
  })
}

function sortInvitations(rows: Array<OrganizationInvitationRow>) {
  return [...rows].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}

async function fetchMembers(organizationId: string) {
  const { data, error } = await authClient.organization.listMembers({
    query: { organizationId },
  })

  if (error) {
    throw new Error(getAuthErrorMessage(error))
  }

  return sortMembers(
    data.members.map((entry) => ({
      memberId: entry.id,
      userId: entry.userId,
      name: entry.user.name,
      email: entry.user.email,
      role: entry.role,
    }))
  )
}

async function fetchInvitations(organizationId: string) {
  const { data, error } = await authClient.organization.listInvitations({
    query: { organizationId },
  })

  if (error) {
    throw new Error(getAuthErrorMessage(error))
  }

  const invitations = Array.isArray(data) ? data : []
  return sortInvitations(
    invitations
      .filter((entry) => entry.status === "pending")
      .map((entry) => ({
        id: entry.id,
        email: entry.email,
        role: entry.role,
        createdAt:
          entry.createdAt instanceof Date
            ? entry.createdAt
            : new Date(entry.createdAt),
      }))
  )
}

export async function listOrganizationMembers(
  organizationId: string,
  options?: { force?: boolean }
) {
  const queryKey = membersQueryKey(organizationId)

  if (options?.force) {
    organizationPeopleQueryClient.removeQueries({ queryKey, exact: true })
  }

  return organizationPeopleQueryClient.fetchQuery({
    queryKey,
    queryFn: () => fetchMembers(organizationId),
    staleTime: PEOPLE_QUERY_STALE_TIME_MS,
  })
}

export async function listOrganizationInvitations(
  organizationId: string,
  options?: { force?: boolean }
) {
  const queryKey = invitationsQueryKey(organizationId)

  if (options?.force) {
    organizationPeopleQueryClient.removeQueries({ queryKey, exact: true })
  }

  return organizationPeopleQueryClient.fetchQuery({
    queryKey,
    queryFn: () => fetchInvitations(organizationId),
    staleTime: PEOPLE_QUERY_STALE_TIME_MS,
  })
}

export function invalidateOrganizationPeopleCache(organizationId: string) {
  void organizationPeopleQueryClient.invalidateQueries({
    queryKey: organizationPeopleQueryKey(organizationId),
  })
}
