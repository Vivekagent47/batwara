// Friend-link helpers and shared-group lookups between users.
import { and, desc, eq, inArray, or } from "drizzle-orm"

import { getUserLookup } from "./access"
import { normalizePairKey } from "./core"
import type { FriendInfo, LedgerUser } from "./types"
import { friendLink, member } from "@/db/schema"
import { db } from "@/db"

export async function getActiveFriendLinkBetweenUsers(
  userAId: string,
  userBId: string
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
        eq(friendLink.pairKey, normalizePairKey(userAId, userBId)),
        eq(friendLink.status, "active")
      )
    )
    .limit(1)

  return rows.at(0) ?? null
}

export async function getUserFriends(userId: string) {
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
        eq(friendLink.status, "active"),
        or(eq(friendLink.userAId, userId), eq(friendLink.userBId, userId))
      )
    )
    .orderBy(desc(friendLink.createdAt))

  if (rows.length === 0) {
    return [] as Array<FriendInfo>
  }

  const otherIds = rows.map((entry) =>
    entry.userAId === userId ? entry.userBId : entry.userAId
  )
  const userLookup = await getUserLookup(otherIds)

  return rows.map((entry) => {
    const otherUserId = entry.userAId === userId ? entry.userBId : entry.userAId
    const otherUser = userLookup.get(otherUserId)
    return {
      id: entry.id,
      status: entry.status,
      otherUser: {
        id: otherUser?.id ?? otherUserId,
        name: otherUser?.name ?? "Unknown user",
        email: otherUser?.email ?? "",
      },
    }
  })
}

export async function getSharedGroupIdsBetweenUsers(
  userAId: string,
  userBId: string
) {
  const userAGroupRows = await db
    .select({ organizationId: member.organizationId })
    .from(member)
    .where(eq(member.userId, userAId))

  const userAGroupIds = Array.from(
    new Set(userAGroupRows.map((entry) => entry.organizationId))
  )

  if (userAGroupIds.length === 0) {
    return [] as Array<string>
  }

  const sharedGroupRows = await db
    .select({ organizationId: member.organizationId })
    .from(member)
    .where(
      and(
        eq(member.userId, userBId),
        inArray(member.organizationId, userAGroupIds)
      )
    )

  return Array.from(
    new Set(sharedGroupRows.map((entry) => entry.organizationId))
  )
}

export async function getFriendContextForUser(
  userId: string,
  friendLinkId: string
) {
  const linkRows = await db
    .select({
      id: friendLink.id,
      userAId: friendLink.userAId,
      userBId: friendLink.userBId,
      status: friendLink.status,
    })
    .from(friendLink)
    .where(eq(friendLink.id, friendLinkId))
    .limit(1)

  const link = linkRows.at(0)
  if (!link || link.status !== "active") {
    throw new Error("Friend ledger is unavailable.")
  }

  if (link.userAId !== userId && link.userBId !== userId) {
    throw new Error("You are not part of this friend ledger.")
  }

  const userLookup = await getUserLookup([link.userAId, link.userBId])
  const members = [link.userAId, link.userBId]
    .map((id) => userLookup.get(id))
    .filter((entry): entry is LedgerUser => Boolean(entry))

  return {
    link,
    members,
    counterpartId: link.userAId === userId ? link.userBId : link.userAId,
  }
}
