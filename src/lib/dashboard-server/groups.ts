// Group-specific helpers for roles, membership, and group-level balances.
import { and, eq, inArray, or } from "drizzle-orm"

import { db } from "@/db"
import {
  expense,
  expenseParticipant,
  groupSettings,
  member,
  organization,
  user,
} from "@/db/schema"

import { getScopedSettlementImpactRows } from "./settlements"
import type { ContextMember, GroupInfo } from "./types"

const MANAGE_GROUP_MEMBER_ROLES = new Set(["owner", "admin"])

export function createSlug(name: string) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 42)

  const seed = Math.random().toString(36).slice(2, 8)
  return `${base || "group"}-${seed}`
}

export function parseMemberRoles(value: string) {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
}

export function getPrimaryMemberRole(value: string) {
  const roles = parseMemberRoles(value)
  if (roles.includes("owner")) {
    return "owner"
  }

  if (roles.includes("admin")) {
    return "admin"
  }

  return roles[0] ?? "member"
}

export function canManageGroupMembers(value: string) {
  return parseMemberRoles(value).some((role) =>
    MANAGE_GROUP_MEMBER_ROLES.has(role)
  )
}

export async function getGroupNetByUser(userId: string, groupIds: Array<string>) {
  if (groupIds.length === 0) {
    return new Map<string, number>()
  }

  const [expenseRows, settlementRows] = await Promise.all([
    db
      .select({
        organizationId: expense.organizationId,
        paidByUserId: expense.paidByUserId,
        participantUserId: expenseParticipant.userId,
        owedAmountMinor: expenseParticipant.owedAmountMinor,
      })
      .from(expenseParticipant)
      .innerJoin(expense, eq(expenseParticipant.expenseId, expense.id))
      .where(
        and(
          inArray(expense.organizationId, groupIds),
          or(
            eq(expense.paidByUserId, userId),
            eq(expenseParticipant.userId, userId)
          )
        )
      ),
    getScopedSettlementImpactRows({ groupIds }),
  ])

  const groupNetMap = new Map<string, number>()

  for (const row of expenseRows) {
    if (!row.organizationId) {
      continue
    }

    let net = groupNetMap.get(row.organizationId) ?? 0

    if (row.paidByUserId === userId) {
      net += row.owedAmountMinor
    }

    if (row.participantUserId === userId) {
      net -= row.owedAmountMinor
    }

    groupNetMap.set(row.organizationId, net)
  }

  for (const row of settlementRows) {
    if (row.scopeType !== "group") {
      continue
    }

    let net = groupNetMap.get(row.scopeId) ?? 0

    if (row.payerUserId === userId) {
      net += row.amountMinor
    }

    if (row.payeeUserId === userId) {
      net -= row.amountMinor
    }

    groupNetMap.set(row.scopeId, net)
  }

  return groupNetMap
}

export async function getUserGroups(userId: string) {
  const groupRows = await db
    .select({
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      role: member.role,
    })
    .from(member)
    .innerJoin(organization, eq(member.organizationId, organization.id))
    .where(eq(member.userId, userId))
    .orderBy(organization.name)

  if (groupRows.length === 0) {
    return [] as Array<GroupInfo>
  }

  const groupIds = groupRows.map((entry) => entry.id)

  const [memberCountRows, groupSettingsRows, groupNetMap] = await Promise.all([
    db
      .select({
        organizationId: member.organizationId,
        count: member.userId,
      })
      .from(member)
      .where(inArray(member.organizationId, groupIds)),
    db
      .select({
        organizationId: groupSettings.organizationId,
        simplifyDebts: groupSettings.simplifyDebts,
        defaultCurrency: groupSettings.defaultCurrency,
      })
      .from(groupSettings)
      .where(inArray(groupSettings.organizationId, groupIds)),
    getGroupNetByUser(userId, groupIds),
  ])

  const memberCountMap = new Map<string, number>()
  for (const row of memberCountRows) {
    memberCountMap.set(
      row.organizationId,
      (memberCountMap.get(row.organizationId) ?? 0) + 1
    )
  }

  const settingMap = new Map(
    groupSettingsRows.map((entry) => [entry.organizationId, entry])
  )

  return groupRows.map((entry) => ({
    id: entry.id,
    name: entry.name,
    slug: entry.slug,
    role: entry.role,
    memberCount: memberCountMap.get(entry.id) ?? 1,
    simplifyDebts: settingMap.get(entry.id)?.simplifyDebts ?? true,
    defaultCurrency: settingMap.get(entry.id)?.defaultCurrency ?? "INR",
    netMinor: groupNetMap.get(entry.id) ?? 0,
  }))
}

export async function getGroupMembers(groupId: string) {
  const rows = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
    })
    .from(member)
    .innerJoin(user, eq(member.userId, user.id))
    .where(eq(member.organizationId, groupId))
    .orderBy(user.name)

  return rows as Array<ContextMember>
}
