// Group creation, membership, and group-composer write functions.
import { and, eq, inArray } from "drizzle-orm"
import { createServerFn } from "@tanstack/react-start"
import { getRequest } from "@tanstack/react-start/server"

import { db } from "@/db"
import {
  activityLog,
  friendLink,
  groupSettings,
  member,
  organization,
  user,
} from "@/db/schema"
import { enforceRateLimit } from "@/lib/rate-limit"

import { requireLedgerUser } from "./access"
import { createSlug, parseMemberRoles } from "./groups"
import { findUserByEmail } from "./mutation-shared"
import { normalizePairKey, toCurrencyCode } from "./core"

export const leaveGroup = createServerFn({ method: "POST" })
  .inputValidator((input: { groupId: string }) => input)
  .handler(async ({ data }) => {
    const currentUser = await requireLedgerUser()
    enforceRateLimit({
      key: `leave-group:${currentUser.id}:${data.groupId}`,
      windowMs: 60_000,
      max: 20,
    })

    const groupId = data.groupId.trim()
    if (!groupId) {
      throw new Error("Group id is required.")
    }

    const [membershipRows, groupRows] = await Promise.all([
      db
        .select({ role: member.role })
        .from(member)
        .where(
          and(
            eq(member.organizationId, groupId),
            eq(member.userId, currentUser.id)
          )
        )
        .limit(1),
      db
        .select({
          id: organization.id,
          name: organization.name,
        })
        .from(organization)
        .where(eq(organization.id, groupId))
        .limit(1),
    ])

    const membership = membershipRows.at(0)
    if (!membership) {
      throw new Error("You are no longer a member of this group.")
    }

    if (parseMemberRoles(membership.role).includes("owner")) {
      throw new Error("Group owners cannot leave the group.")
    }

    const group = groupRows.at(0)
    if (!group) {
      throw new Error("Group not found.")
    }

    const now = new Date()
    const request = getRequest()
    const { auth } = await import("@/lib/auth")

    await auth.api.leaveOrganization({
      headers: new Headers(request.headers),
      body: {
        organizationId: groupId,
      },
    })

    await db.insert(activityLog).values({
      id: crypto.randomUUID(),
      organizationId: groupId,
      actorUserId: currentUser.id,
      entityType: "group_member",
      entityId: currentUser.id,
      action: "left",
      summary: `${currentUser.name} left ${group.name}.`,
      createdAt: now,
    })

    return { success: true }
  })

export const createGroup = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      name: string
      defaultCurrency?: string
      memberUserIds?: Array<string>
    }) => input
  )
  .handler(async ({ data }) => {
    const currentUser = await requireLedgerUser()
    enforceRateLimit({
      key: `create-group:${currentUser.id}`,
      windowMs: 60_000,
      max: 12,
    })

    const name = data.name.trim()
    if (name.length < 2) {
      throw new Error("Group name must be at least 2 characters.")
    }

    const requestedMemberIds = Array.from(
      new Set(
        (data.memberUserIds ?? []).map((entry) => entry.trim()).filter(Boolean)
      )
    ).filter((entry) => entry !== currentUser.id)

    if (requestedMemberIds.length > 50) {
      throw new Error("You can add up to 50 members while creating a group.")
    }

    let extraMemberIds: Array<string> = []
    if (requestedMemberIds.length > 0) {
      const matchedUsers = await db
        .select({
          id: user.id,
        })
        .from(user)
        .where(inArray(user.id, requestedMemberIds))

      extraMemberIds = matchedUsers.map((entry) => entry.id)

      if (extraMemberIds.length !== requestedMemberIds.length) {
        throw new Error(
          "One or more selected members are unavailable. Refresh and try again."
        )
      }
    }

    const organizationId = crypto.randomUUID()
    const now = new Date()
    const memberRows = [currentUser.id, ...extraMemberIds].map((userId) => ({
      id: crypto.randomUUID(),
      organizationId,
      userId,
      role: userId === currentUser.id ? "owner" : "member",
      createdAt: now,
    }))

    await db.transaction(async (tx) => {
      await tx.insert(organization).values({
        id: organizationId,
        name,
        slug: createSlug(name),
        createdAt: now,
      })

      await tx.insert(member).values(memberRows)

      await tx.insert(groupSettings).values({
        organizationId,
        defaultCurrency: toCurrencyCode(data.defaultCurrency),
        simplifyDebts: true,
        createdAt: now,
        updatedAt: now,
      })

      await tx.insert(activityLog).values({
        id: crypto.randomUUID(),
        organizationId,
        actorUserId: currentUser.id,
        entityType: "group",
        entityId: organizationId,
        action: "created",
        summary:
          extraMemberIds.length > 0
            ? `${currentUser.name} created ${name} with ${extraMemberIds.length + 1} members.`
            : `${currentUser.name} created ${name}.`,
        createdAt: now,
      })
    })

    return {
      groupId: organizationId,
      memberCount: memberRows.length,
    }
  })

export const lookupGroupMemberByEmail = createServerFn({ method: "POST" })
  .inputValidator((input: { email: string }) => input)
  .handler(async ({ data }) => {
    const currentUser = await requireLedgerUser()
    enforceRateLimit({
      key: `group-member-lookup:${currentUser.id}`,
      windowMs: 60_000,
      max: 50,
    })

    const email = data.email.trim().toLowerCase()
    if (!email) {
      throw new Error("Email is required.")
    }

    const targetUser = await findUserByEmail(email)
    if (!targetUser) {
      throw new Error("No Batwara user was found for this email.")
    }

    if (targetUser.id === currentUser.id) {
      throw new Error("You are already included in every group you create.")
    }

    const pairKey = normalizePairKey(currentUser.id, targetUser.id)
    const friendRows = await db
      .select({
        id: friendLink.id,
      })
      .from(friendLink)
      .where(
        and(eq(friendLink.pairKey, pairKey), eq(friendLink.status, "active"))
      )
      .limit(1)

    return {
      user: targetUser,
      alreadyFriend: Boolean(friendRows[0]),
    }
  })
