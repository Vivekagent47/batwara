// Auth-scoped access helpers, invitation reads, and user lookup utilities.
import { and, desc, eq, gt, inArray, or } from "drizzle-orm"
import { redirect } from "@tanstack/react-router"

import { db } from "@/db"
import {
  friendLink,
  invitation,
  member,
  organization,
  user,
} from "@/db/schema"
import { getServerAuthSession } from "@/lib/auth-session"

import { safeDate } from "./core"
import type { LedgerUser, PendingInvitationItem, UserLookup } from "./types"

export async function requireLedgerUser() {
  const session = await getServerAuthSession()
  if (!session?.user) {
    throw redirect({ to: "/login" })
  }

  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
  } as LedgerUser
}

export async function getPendingInvitationsForUser(
  email: string
): Promise<Array<PendingInvitationItem>> {
  const normalizedEmail = email.trim().toLowerCase()
  if (!normalizedEmail) {
    return []
  }

  const now = new Date()
  const rows = await db
    .select({
      id: invitation.id,
      organizationName: organization.name,
      invitedEmail: invitation.email,
      role: invitation.role,
      createdAt: invitation.createdAt,
      expiresAt: invitation.expiresAt,
    })
    .from(invitation)
    .innerJoin(organization, eq(invitation.organizationId, organization.id))
    .where(
      and(
        eq(invitation.email, normalizedEmail),
        eq(invitation.status, "pending"),
        gt(invitation.expiresAt, now)
      )
    )
    .orderBy(desc(invitation.createdAt))

  return rows.map((entry) => ({
    id: entry.id,
    organizationName: entry.organizationName,
    invitedEmail: entry.invitedEmail,
    role: entry.role ?? "member",
    createdAt: safeDate(entry.createdAt),
    expiresAt: safeDate(entry.expiresAt),
  }))
}

export async function getUserLookup(userIds: Array<string>) {
  if (userIds.length === 0) {
    return new Map() as UserLookup
  }

  const rows = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
    })
    .from(user)
    .where(inArray(user.id, Array.from(new Set(userIds))))

  return new Map(rows.map((entry) => [entry.id, entry])) as UserLookup
}

export async function getAccessibleFriendLinkById(
  userId: string,
  friendLinkId: string
) {
  const rows = await db
    .select({
      id: friendLink.id,
      userAId: friendLink.userAId,
      userBId: friendLink.userBId,
      status: friendLink.status,
    })
    .from(friendLink)
    .where(
      and(
        eq(friendLink.id, friendLinkId),
        eq(friendLink.status, "active"),
        or(eq(friendLink.userAId, userId), eq(friendLink.userBId, userId))
      )
    )
    .limit(1)

  return rows.at(0) ?? null
}

export async function assertGroupAccess(userId: string, groupId: string) {
  const membership = await db
    .select({ organizationId: member.organizationId })
    .from(member)
    .where(and(eq(member.organizationId, groupId), eq(member.userId, userId)))
    .limit(1)

  if (!membership[0]) {
    throw new Error("You are not a member of this group.")
  }
}
