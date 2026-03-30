import { and, desc, eq, gt, inArray, or } from "drizzle-orm"
import { redirect } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"
import { getRequest } from "@tanstack/react-start/server"

import type {
  PairwiseDebtRow,
  SettlementImpactRow,
  SettlementScopeType,
} from "@/lib/settlement-ledger"
import { db } from "@/db"
import {
  activityLog,
  expense,
  expenseParticipant,
  friendLink,
  groupSettings,
  invitation,
  member,
  organization,
  settlement,
  settlementAllocation,
  user,
} from "@/db/schema"
import { auth } from "@/lib/auth"
import { getServerAuthSession } from "@/lib/auth-session"
import { parseDayInputAtUtcMidday } from "@/lib/date-only"
import { canManageExpense } from "@/lib/expense-permissions"
import {
  settlementsDisabledMessage,
  settlementsEnabled,
} from "@/lib/feature-flags-server"
import { enforceRateLimit } from "@/lib/rate-limit"
import { buildPairwiseSettlementPlan } from "@/lib/settlement-ledger"

export type LedgerContextType = "group" | "friend"
export type ExpenseSplitMethod = "equal" | "exact" | "percentage" | "shares"

type LedgerUser = {
  id: string
  name: string
  email: string
}

type SplitInputLine = {
  userId: string
  value?: number
}

type TransferSuggestion = {
  payerUserId: string
  payeeUserId: string
  amountMinor: number
}

type ActivityItem = {
  id: string
  action: string
  summary: string
  entityType: string
  entityId: string
  createdAt: Date
  actor: {
    id: string
    name: string
  }
  expenseImpact: {
    direction: "pay" | "collect"
    amountMinor: number
  } | null
}

type GroupInfo = {
  id: string
  name: string
  slug: string
  role: string
  memberCount: number
  simplifyDebts: boolean
  defaultCurrency: string
  netMinor: number
}

type FriendInfo = {
  id: string
  otherUser: {
    id: string
    name: string
    email: string
  }
  status: string
}

type FriendPairExpenseItem = {
  id: string
  title: string
  totalAmountMinor: number
  incurredAt: Date
  paidByUserId: string
  paidByName: string
  organizationId: string | null
  organizationName: string | null
  contextType: "group" | "direct"
  contextName: string
  pairImpact: {
    direction: "pay" | "collect"
    amountMinor: number
  }
}

type ContextMember = {
  id: string
  name: string
  email: string
}

type SettlementCounterparty = {
  id: string
  name: string
  email: string
  isFriend: boolean
  sharedGroupCount: number
}

type PendingInvitationItem = {
  id: string
  organizationName: string
  invitedEmail: string
  role: string
  createdAt: Date
  expiresAt: Date
}

type UserLookup = Map<string, LedgerUser>

const GROUP_EXPENSE_PAGE_SIZE = 15
const FRIEND_EXPENSE_PAGE_SIZE = 20
const SETTLEMENT_ALLOCATION_TABLE = "settlement_allocation"

function safeDate(value: Date | null | undefined) {
  return value ?? new Date()
}

async function getPendingInvitationsForUser(
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

function toCurrencyCode(value: string | undefined) {
  if (!value) {
    return "INR"
  }

  return value.trim().toUpperCase().slice(0, 3)
}

function toMinorUnits(value: number) {
  return Math.round(value)
}

function normalizePairKey(userAId: string, userBId: string) {
  const [a, b] = [userAId, userBId].sort()
  return `${a}:${b}`
}

function isMissingSettlementAllocationTableError(error: unknown): boolean {
  const queue: Array<unknown> = [error]

  while (queue.length > 0) {
    const current = queue.shift()
    if (!current || typeof current !== "object") {
      continue
    }

    const currentRecord = current as Record<string, unknown>
    if (currentRecord.code === "42P01") {
      return true
    }

    const message =
      typeof currentRecord.message === "string" ? currentRecord.message : ""
    if (
      message.includes(SETTLEMENT_ALLOCATION_TABLE) &&
      (message.includes("does not exist") || message.includes("Failed query"))
    ) {
      return true
    }

    if ("cause" in currentRecord) {
      queue.push(currentRecord.cause)
    }
  }

  return false
}

function createSlug(name: string) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 42)

  const seed = Math.random().toString(36).slice(2, 8)
  return `${base || "group"}-${seed}`
}

const MANAGE_GROUP_MEMBER_ROLES = new Set(["owner", "admin"])

function parseMemberRoles(value: string) {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
}

function getPrimaryMemberRole(value: string) {
  const roles = parseMemberRoles(value)
  if (roles.includes("owner")) {
    return "owner"
  }

  if (roles.includes("admin")) {
    return "admin"
  }

  return roles[0] ?? "member"
}

function canManageGroupMembers(value: string) {
  return parseMemberRoles(value).some((role) =>
    MANAGE_GROUP_MEMBER_ROLES.has(role)
  )
}

function allocateByWeights(totalMinor: number, weights: Array<number>) {
  const sumWeights = weights.reduce((acc, value) => acc + value, 0)
  if (sumWeights <= 0) {
    throw new Error("Split weights must add up to more than zero.")
  }

  const raw = weights.map((weight) => (totalMinor * weight) / sumWeights)
  const allocated = raw.map((value) => Math.floor(value))
  let remainder = totalMinor - allocated.reduce((acc, value) => acc + value, 0)

  const fractions = raw
    .map((value, index) => ({
      index,
      fraction: value - Math.floor(value),
    }))
    .sort((a, b) => b.fraction - a.fraction)

  let pointer = 0
  while (remainder > 0) {
    allocated[fractions[pointer % fractions.length].index] += 1
    remainder -= 1
    pointer += 1
  }

  return allocated
}

function resolveSplit(
  totalMinor: number,
  method: ExpenseSplitMethod,
  lines: Array<SplitInputLine>
) {
  if (totalMinor <= 0) {
    throw new Error("Amount must be more than zero.")
  }

  if (lines.length === 0) {
    throw new Error("At least one participant is required.")
  }

  const deduped = new Map<string, SplitInputLine>()
  for (const line of lines) {
    if (!line.userId) {
      continue
    }
    deduped.set(line.userId, line)
  }

  const normalizedLines = Array.from(deduped.values())
  if (normalizedLines.length === 0) {
    throw new Error("At least one participant is required.")
  }

  if (method === "equal") {
    const base = Math.floor(totalMinor / normalizedLines.length)
    const remainder = totalMinor % normalizedLines.length
    return normalizedLines.map((line, index) => ({
      userId: line.userId,
      owedAmountMinor: base + (index < remainder ? 1 : 0),
    }))
  }

  const values = normalizedLines.map((line) => Number(line.value ?? 0))

  if (method === "exact") {
    const owed = values.map((value) => toMinorUnits(value))
    const total = owed.reduce((acc, value) => acc + value, 0)
    if (total !== totalMinor) {
      throw new Error("Exact split must add up to the full expense amount.")
    }

    return normalizedLines.map((line, index) => ({
      userId: line.userId,
      owedAmountMinor: owed[index] ?? 0,
    }))
  }

  if (method === "percentage") {
    const sum = values.reduce((acc, value) => acc + value, 0)
    if (Math.abs(sum - 100) > 0.001) {
      throw new Error("Percentage split must add up to 100.")
    }

    const allocations = allocateByWeights(totalMinor, values)
    return normalizedLines.map((line, index) => ({
      userId: line.userId,
      owedAmountMinor: allocations[index] ?? 0,
    }))
  }

  const allocations = allocateByWeights(totalMinor, values)
  return normalizedLines.map((line, index) => ({
    userId: line.userId,
    owedAmountMinor: allocations[index] ?? 0,
  }))
}

function simplifyNetBalances(netMap: Map<string, number>) {
  const creditors: Array<{ userId: string; amountMinor: number }> = []
  const debtors: Array<{ userId: string; amountMinor: number }> = []

  for (const [userId, net] of netMap.entries()) {
    if (net > 0) {
      creditors.push({ userId, amountMinor: net })
    } else if (net < 0) {
      debtors.push({ userId, amountMinor: Math.abs(net) })
    }
  }

  creditors.sort((a, b) => b.amountMinor - a.amountMinor)
  debtors.sort((a, b) => b.amountMinor - a.amountMinor)

  const transfers: Array<TransferSuggestion> = []
  let creditorIndex = 0
  let debtorIndex = 0

  while (creditorIndex < creditors.length && debtorIndex < debtors.length) {
    const creditor = creditors[creditorIndex]
    const debtor = debtors[debtorIndex]
    const amountMinor = Math.min(creditor.amountMinor, debtor.amountMinor)

    if (amountMinor > 0) {
      transfers.push({
        payerUserId: debtor.userId,
        payeeUserId: creditor.userId,
        amountMinor,
      })
    }

    creditor.amountMinor -= amountMinor
    debtor.amountMinor -= amountMinor

    if (creditor.amountMinor === 0) {
      creditorIndex += 1
    }

    if (debtor.amountMinor === 0) {
      debtorIndex += 1
    }
  }

  return transfers
}

async function requireLedgerUser() {
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

async function getUserLookup(userIds: Array<string>) {
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

async function getActiveFriendLinkBetweenUsers(
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

async function getScopedSettlementImpactRows(args: {
  groupIds?: Array<string>
  friendLinkIds?: Array<string>
}) {
  type ScopedImpactSourceRow = {
    organizationId: string | null
    friendLinkId: string | null
    payerUserId: string
    payeeUserId: string
    amountMinor: number
  }

  const groupIds = Array.from(new Set(args.groupIds ?? []))
  const friendLinkIds = Array.from(new Set(args.friendLinkIds ?? []))
  const scopeClauses = []

  if (groupIds.length > 0) {
    scopeClauses.push(inArray(settlementAllocation.organizationId, groupIds))
  }

  if (friendLinkIds.length > 0) {
    scopeClauses.push(inArray(settlementAllocation.friendLinkId, friendLinkIds))
  }

  const legacyScopeClauses = []
  if (groupIds.length > 0) {
    legacyScopeClauses.push(inArray(settlement.organizationId, groupIds))
  }

  if (friendLinkIds.length > 0) {
    legacyScopeClauses.push(inArray(settlement.friendLinkId, friendLinkIds))
  }

  if (scopeClauses.length === 0 && legacyScopeClauses.length === 0) {
    return [] as Array<SettlementImpactRow>
  }

  const legacyRows: Array<ScopedImpactSourceRow> =
    legacyScopeClauses.length === 0
      ? []
      : await db
          .select({
            organizationId: settlement.organizationId,
            friendLinkId: settlement.friendLinkId,
            payerUserId: settlement.payerUserId,
            payeeUserId: settlement.payeeUserId,
            amountMinor: settlement.amountMinor,
          })
          .from(settlement)
          .where(
            legacyScopeClauses.length === 1
              ? legacyScopeClauses[0]
              : or(...legacyScopeClauses)
          )

  let allocationRows: Array<ScopedImpactSourceRow> = []
  if (scopeClauses.length > 0) {
    try {
      allocationRows = await db
        .select({
          organizationId: settlementAllocation.organizationId,
          friendLinkId: settlementAllocation.friendLinkId,
          payerUserId: settlementAllocation.payerUserId,
          payeeUserId: settlementAllocation.payeeUserId,
          amountMinor: settlementAllocation.amountMinor,
        })
        .from(settlementAllocation)
        .where(
          scopeClauses.length === 1 ? scopeClauses[0] : or(...scopeClauses)
        )
    } catch (error) {
      if (!isMissingSettlementAllocationTableError(error)) {
        throw error
      }
    }
  }

  const impactRows: Array<SettlementImpactRow> = []
  for (const row of [...allocationRows, ...legacyRows]) {
    if (row.organizationId) {
      impactRows.push({
        scopeType: "group",
        scopeId: row.organizationId,
        payerUserId: row.payerUserId,
        payeeUserId: row.payeeUserId,
        amountMinor: row.amountMinor,
      })
      continue
    }

    if (row.friendLinkId) {
      impactRows.push({
        scopeType: "friend",
        scopeId: row.friendLinkId,
        payerUserId: row.payerUserId,
        payeeUserId: row.payeeUserId,
        amountMinor: row.amountMinor,
      })
    }
  }

  return impactRows
}

async function getSettlementCounterparties(userId: string) {
  const [friends, groupRows] = await Promise.all([
    getUserFriends(userId),
    db
      .select({ organizationId: member.organizationId })
      .from(member)
      .where(eq(member.userId, userId)),
  ])

  const groupIds = Array.from(
    new Set(groupRows.map((entry) => entry.organizationId))
  )
  const groupMemberRows =
    groupIds.length === 0
      ? []
      : await db
          .select({
            id: user.id,
            name: user.name,
            email: user.email,
            organizationId: member.organizationId,
          })
          .from(member)
          .innerJoin(user, eq(member.userId, user.id))
          .where(inArray(member.organizationId, groupIds))

  const sharedGroupCountByUserId = new Map<string, number>()
  for (const row of groupMemberRows) {
    if (row.id === userId) {
      continue
    }

    sharedGroupCountByUserId.set(
      row.id,
      (sharedGroupCountByUserId.get(row.id) ?? 0) + 1
    )
  }

  const counterparties = new Map<string, SettlementCounterparty>()

  for (const friend of friends) {
    counterparties.set(friend.otherUser.id, {
      id: friend.otherUser.id,
      name: friend.otherUser.name,
      email: friend.otherUser.email,
      isFriend: true,
      sharedGroupCount: sharedGroupCountByUserId.get(friend.otherUser.id) ?? 0,
    })
  }

  for (const row of groupMemberRows) {
    if (row.id === userId) {
      continue
    }

    const current = counterparties.get(row.id)
    counterparties.set(row.id, {
      id: row.id,
      name: current?.name ?? row.name,
      email: current?.email ?? row.email,
      isFriend: current?.isFriend ?? false,
      sharedGroupCount: sharedGroupCountByUserId.get(row.id) ?? 0,
    })
  }

  return Array.from(counterparties.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  )
}

async function getPairwiseSettlementContext(
  userId: string,
  counterpartyUserId: string
) {
  const [userLookup, activeFriendLink, sharedGroupIds] = await Promise.all([
    getUserLookup([counterpartyUserId]),
    getActiveFriendLinkBetweenUsers(userId, counterpartyUserId),
    getSharedGroupIdsBetweenUsers(userId, counterpartyUserId),
  ])

  const counterparty = userLookup.get(counterpartyUserId)
  if (!counterparty) {
    throw new Error("Counterparty is unavailable.")
  }

  if (!activeFriendLink && sharedGroupIds.length === 0) {
    throw new Error("You do not share any accessible balance with this user.")
  }

  const expenseScopeClauses = []
  if (activeFriendLink) {
    expenseScopeClauses.push(eq(expense.friendLinkId, activeFriendLink.id))
  }

  if (sharedGroupIds.length > 0) {
    expenseScopeClauses.push(inArray(expense.organizationId, sharedGroupIds))
  }

  const expenseRows =
    expenseScopeClauses.length === 0
      ? []
      : await db
          .select({
            id: expense.id,
            organizationId: expense.organizationId,
            friendLinkId: expense.friendLinkId,
            organizationName: organization.name,
            incurredAt: expense.incurredAt,
            paidByUserId: expense.paidByUserId,
            participantUserId: expenseParticipant.userId,
            owedAmountMinor: expenseParticipant.owedAmountMinor,
          })
          .from(expenseParticipant)
          .innerJoin(expense, eq(expenseParticipant.expenseId, expense.id))
          .leftJoin(organization, eq(expense.organizationId, organization.id))
          .where(
            and(
              gt(expenseParticipant.owedAmountMinor, 0),
              expenseScopeClauses.length === 1
                ? expenseScopeClauses[0]
                : or(...expenseScopeClauses),
              inArray(expense.paidByUserId, [userId, counterpartyUserId]),
              inArray(expenseParticipant.userId, [userId, counterpartyUserId])
            )
          )

  const debtRows: Array<PairwiseDebtRow> = []
  for (const row of expenseRows) {
    if (row.participantUserId === row.paidByUserId) {
      continue
    }

    const scopeType: SettlementScopeType = row.organizationId
      ? "group"
      : "friend"
    const scopeId = row.organizationId ?? row.friendLinkId
    if (!scopeId) {
      continue
    }

    debtRows.push({
      scopeType,
      scopeId,
      scopeName: row.organizationId
        ? (row.organizationName ?? "Group")
        : "Direct",
      creditorUserId: row.paidByUserId,
      debtorUserId: row.participantUserId,
      amountMinor: row.owedAmountMinor,
      incurredAt: safeDate(row.incurredAt),
      expenseId: row.id,
    })
  }

  const settlementImpactRows = (
    await getScopedSettlementImpactRows({
      groupIds: sharedGroupIds,
      friendLinkIds: activeFriendLink ? [activeFriendLink.id] : [],
    })
  ).filter(
    (row) =>
      (row.payerUserId === userId || row.payerUserId === counterpartyUserId) &&
      (row.payeeUserId === userId || row.payeeUserId === counterpartyUserId)
  )

  return {
    counterparty,
    activeFriendLink,
    sharedGroupIds,
    debtRows,
    settlementImpactRows,
  }
}

async function preparePairwiseSettlementPlan(args: {
  currentUserId: string
  counterpartyUserId: string
  payerUserId: string
  payeeUserId: string
  amountMinor: number
}) {
  const counterpartyUserId = args.counterpartyUserId.trim()
  if (!counterpartyUserId) {
    throw new Error("Choose who this settlement is with.")
  }

  if (counterpartyUserId === args.currentUserId) {
    throw new Error("Choose another user to settle with.")
  }

  if (args.payerUserId === args.payeeUserId) {
    throw new Error("Payer and payee must be different.")
  }

  const allowedUserIds = new Set([args.currentUserId, counterpartyUserId])
  if (
    !allowedUserIds.has(args.payerUserId) ||
    !allowedUserIds.has(args.payeeUserId)
  ) {
    throw new Error(
      "Settlement users must match you and the selected counterparty."
    )
  }

  const amountMinor = toMinorUnits(args.amountMinor)
  if (amountMinor <= 0) {
    throw new Error("Settlement amount must be more than zero.")
  }

  const context = await getPairwiseSettlementContext(
    args.currentUserId,
    counterpartyUserId
  )
  const plan = buildPairwiseSettlementPlan({
    debtRows: context.debtRows,
    settlementImpactRows: context.settlementImpactRows,
    payerUserId: args.payerUserId,
    payeeUserId: args.payeeUserId,
    amountMinor,
  })

  return {
    amountMinor,
    counterparty: context.counterparty,
    activeFriendLink: context.activeFriendLink,
    allocations: plan.allocations,
    outstandingTotal: plan.outstandingTotal,
  }
}

async function getGroupNetByUser(userId: string, groupIds: Array<string>) {
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

async function getUserGroups(userId: string) {
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

async function getUserFriends(userId: string) {
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

async function getSharedGroupIdsBetweenUsers(userAId: string, userBId: string) {
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

async function assertGroupAccess(userId: string, groupId: string) {
  const membership = await db
    .select({ organizationId: member.organizationId })
    .from(member)
    .where(and(eq(member.organizationId, groupId), eq(member.userId, userId)))
    .limit(1)

  if (!membership[0]) {
    throw new Error("You are not a member of this group.")
  }
}

async function getGroupMembers(groupId: string) {
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

async function getFriendContextForUser(userId: string, friendLinkId: string) {
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

async function getExpenseContextForUser(userId: string, expenseId: string) {
  const expenseRows = await db
    .select({
      id: expense.id,
      organizationId: expense.organizationId,
      friendLinkId: expense.friendLinkId,
      title: expense.title,
      description: expense.description,
      currency: expense.currency,
      totalAmountMinor: expense.totalAmountMinor,
      splitMethod: expense.splitMethod,
      splitMeta: expense.splitMeta,
      createdByUserId: expense.createdByUserId,
      incurredAt: expense.incurredAt,
      createdAt: expense.createdAt,
      updatedAt: expense.updatedAt,
      paidByUserId: expense.paidByUserId,
      paidByName: user.name,
    })
    .from(expense)
    .innerJoin(user, eq(expense.paidByUserId, user.id))
    .where(eq(expense.id, expenseId))
    .limit(1)

  const expenseRow = expenseRows.at(0)
  if (!expenseRow) {
    throw new Error("Expense not found.")
  }

  if (expenseRow.organizationId) {
    await assertGroupAccess(userId, expenseRow.organizationId)
    const [groupRows, members] = await Promise.all([
      db
        .select({
          id: organization.id,
          name: organization.name,
        })
        .from(organization)
        .where(eq(organization.id, expenseRow.organizationId))
        .limit(1),
      getGroupMembers(expenseRow.organizationId),
    ])

    const group = groupRows.at(0)
    if (!group) {
      throw new Error("Group not found.")
    }

    return {
      expenseRow,
      contextType: "group" as const,
      contextId: group.id,
      contextName: group.name,
      members,
    }
  }

  if (expenseRow.friendLinkId) {
    const { members } = await getFriendContextForUser(
      userId,
      expenseRow.friendLinkId
    )
    const counterpart = members.find((entry) => entry.id !== userId)

    return {
      expenseRow,
      contextType: "friend" as const,
      contextId: expenseRow.friendLinkId,
      contextName: counterpart?.name ?? "Friend ledger",
      members,
    }
  }

  throw new Error("Expense ledger context is invalid.")
}

async function getAccessibleActivities(
  groupIds: Array<string>,
  friendLinkIds: Array<string>,
  limit = 30
) {
  const accessClauses = []
  if (groupIds.length > 0) {
    accessClauses.push(inArray(activityLog.organizationId, groupIds))
  }

  if (friendLinkIds.length > 0) {
    accessClauses.push(inArray(activityLog.friendLinkId, friendLinkIds))
  }

  if (accessClauses.length === 0) {
    return [] as Array<ActivityItem>
  }

  const rows = await db
    .select({
      id: activityLog.id,
      action: activityLog.action,
      summary: activityLog.summary,
      entityType: activityLog.entityType,
      entityId: activityLog.entityId,
      createdAt: activityLog.createdAt,
      actorUserId: activityLog.actorUserId,
    })
    .from(activityLog)
    .where(accessClauses.length === 1 ? accessClauses[0] : or(...accessClauses))
    .orderBy(desc(activityLog.createdAt))
    .limit(limit)

  const actorLookup = await getUserLookup(
    rows.map((entry) => entry.actorUserId)
  )

  return rows.map((entry) => ({
    id: entry.id,
    action: entry.action,
    summary: entry.summary,
    entityType: entry.entityType,
    entityId: entry.entityId,
    createdAt: safeDate(entry.createdAt),
    actor: {
      id: entry.actorUserId,
      name: actorLookup.get(entry.actorUserId)?.name ?? "Unknown user",
    },
    expenseImpact: null,
  }))
}

async function attachExpenseActivityImpacts(
  activity: Array<ActivityItem>,
  userId: string
) {
  const expenseIds = Array.from(
    new Set(
      activity
        .filter((entry) => entry.entityType === "expense")
        .map((entry) => entry.entityId)
    )
  )

  if (expenseIds.length === 0) {
    return activity
  }

  const rows = await db
    .select({
      expenseId: expense.id,
      paidAmountMinor: expenseParticipant.paidAmountMinor,
      owedAmountMinor: expenseParticipant.owedAmountMinor,
    })
    .from(expenseParticipant)
    .innerJoin(expense, eq(expenseParticipant.expenseId, expense.id))
    .where(
      and(
        eq(expenseParticipant.userId, userId),
        inArray(expense.id, expenseIds)
      )
    )

  const impactMap = new Map<
    string,
    {
      direction: "pay" | "collect"
      amountMinor: number
    }
  >()

  for (const row of rows) {
    const netMinor = row.paidAmountMinor - row.owedAmountMinor
    if (netMinor > 0) {
      impactMap.set(row.expenseId, {
        direction: "collect",
        amountMinor: netMinor,
      })
    } else if (netMinor < 0) {
      impactMap.set(row.expenseId, {
        direction: "pay",
        amountMinor: Math.abs(netMinor),
      })
    }
  }

  return activity.map((entry) =>
    entry.entityType === "expense"
      ? {
          ...entry,
          expenseImpact: impactMap.get(entry.entityId) ?? null,
        }
      : entry
  )
}

async function getExpenseImpactLookup(
  userId: string,
  expenseIds: Array<string>
) {
  const impactMap = new Map<
    string,
    {
      direction: "pay" | "collect"
      amountMinor: number
    }
  >()

  if (expenseIds.length === 0) {
    return impactMap
  }

  const rows = await db
    .select({
      expenseId: expenseParticipant.expenseId,
      paidAmountMinor: expenseParticipant.paidAmountMinor,
      owedAmountMinor: expenseParticipant.owedAmountMinor,
    })
    .from(expenseParticipant)
    .where(
      and(
        eq(expenseParticipant.userId, userId),
        inArray(expenseParticipant.expenseId, expenseIds)
      )
    )

  for (const row of rows) {
    const netMinor = row.paidAmountMinor - row.owedAmountMinor
    if (netMinor > 0) {
      impactMap.set(row.expenseId, {
        direction: "collect",
        amountMinor: netMinor,
      })
    } else if (netMinor < 0) {
      impactMap.set(row.expenseId, {
        direction: "pay",
        amountMinor: Math.abs(netMinor),
      })
    }
  }

  return impactMap
}

async function getPairwiseSummary(
  userId: string,
  groupIds: Array<string>,
  friendIds: Array<string>
) {
  const expenseScopeClauses = []
  if (groupIds.length > 0) {
    expenseScopeClauses.push(inArray(expense.organizationId, groupIds))
  }

  if (friendIds.length > 0) {
    expenseScopeClauses.push(inArray(expense.friendLinkId, friendIds))
  }

  if (expenseScopeClauses.length === 0) {
    return {
      youOweMinor: 0,
      youAreOwedMinor: 0,
      suggestions: [] as Array<
        TransferSuggestion & {
          counterparty: {
            id: string
            name: string
          }
          direction: "pay" | "collect"
        }
      >,
    }
  }

  const expenseRows = await db
    .select({
      paidByUserId: expense.paidByUserId,
      participantUserId: expenseParticipant.userId,
      owedAmountMinor: expenseParticipant.owedAmountMinor,
    })
    .from(expenseParticipant)
    .innerJoin(expense, eq(expenseParticipant.expenseId, expense.id))
    .where(
      expenseScopeClauses.length === 1
        ? expenseScopeClauses[0]
        : or(...expenseScopeClauses)
    )

  const settlementRows = await getScopedSettlementImpactRows({
    groupIds,
    friendLinkIds: friendIds,
  })

  const pairMap = new Map<string, number>()

  for (const row of expenseRows) {
    if (row.participantUserId === row.paidByUserId) {
      continue
    }

    const key = `${row.paidByUserId}|${row.participantUserId}`
    pairMap.set(key, (pairMap.get(key) ?? 0) + row.owedAmountMinor)
  }

  for (const row of settlementRows) {
    const key = `${row.payeeUserId}|${row.payerUserId}`
    pairMap.set(key, (pairMap.get(key) ?? 0) - row.amountMinor)
  }

  const counterparties = new Set<string>()
  for (const key of pairMap.keys()) {
    const [creditorId, debtorId] = key.split("|")
    if (creditorId === userId) {
      counterparties.add(debtorId)
    }
    if (debtorId === userId) {
      counterparties.add(creditorId)
    }
  }

  const userLookup = await getUserLookup(Array.from(counterparties))

  let youOweMinor = 0
  let youAreOwedMinor = 0
  const suggestions: Array<
    TransferSuggestion & {
      counterparty: {
        id: string
        name: string
      }
      direction: "pay" | "collect"
    }
  > = []

  for (const counterpartyId of counterparties) {
    const theyOweYou = pairMap.get(`${userId}|${counterpartyId}`) ?? 0
    const youOweThem = pairMap.get(`${counterpartyId}|${userId}`) ?? 0
    const net = theyOweYou - youOweThem

    if (net > 0) {
      youAreOwedMinor += net
      suggestions.push({
        payerUserId: counterpartyId,
        payeeUserId: userId,
        amountMinor: net,
        counterparty: {
          id: counterpartyId,
          name: userLookup.get(counterpartyId)?.name ?? "Unknown user",
        },
        direction: "collect",
      })
    } else if (net < 0) {
      youOweMinor += Math.abs(net)
      suggestions.push({
        payerUserId: userId,
        payeeUserId: counterpartyId,
        amountMinor: Math.abs(net),
        counterparty: {
          id: counterpartyId,
          name: userLookup.get(counterpartyId)?.name ?? "Unknown user",
        },
        direction: "pay",
      })
    }
  }

  suggestions.sort((a, b) => b.amountMinor - a.amountMinor)

  return {
    youOweMinor,
    youAreOwedMinor,
    suggestions,
  }
}

function buildNetMap(
  expenseRows: Array<{
    paidByUserId: string
    participantUserId: string
    owedAmountMinor: number
  }>,
  settlementRows: Array<{
    payerUserId: string
    payeeUserId: string
    amountMinor: number
  }>
) {
  const net = new Map<string, number>()

  for (const row of expenseRows) {
    net.set(
      row.paidByUserId,
      (net.get(row.paidByUserId) ?? 0) + row.owedAmountMinor
    )
    net.set(
      row.participantUserId,
      (net.get(row.participantUserId) ?? 0) - row.owedAmountMinor
    )
  }

  for (const row of settlementRows) {
    net.set(row.payerUserId, (net.get(row.payerUserId) ?? 0) + row.amountMinor)
    net.set(row.payeeUserId, (net.get(row.payeeUserId) ?? 0) - row.amountMinor)
  }

  return net
}

export const getDashboardHomeData = createServerFn({ method: "GET" }).handler(
  async () => {
    const currentUser = await requireLedgerUser()
    enforceRateLimit({
      key: `dashboard-home:${currentUser.id}`,
      windowMs: 60_000,
      max: 120,
    })

    const [groups, friends] = await Promise.all([
      getUserGroups(currentUser.id),
      getUserFriends(currentUser.id),
    ])

    const groupIds = groups.map((entry) => entry.id)
    const friendIds = friends.map((entry) => entry.id)

    const [summary, activity, pendingInvitationRows] = await Promise.all([
      getPairwiseSummary(currentUser.id, groupIds, friendIds),
      getAccessibleActivities(groupIds, friendIds, 14),
      db
        .select({ id: invitation.id })
        .from(invitation)
        .where(
          and(
            eq(invitation.email, currentUser.email.toLowerCase()),
            eq(invitation.status, "pending"),
            gt(invitation.expiresAt, new Date())
          )
        ),
    ])

    return {
      user: currentUser,
      groups,
      friends,
      summary: {
        youOweMinor: summary.youOweMinor,
        youAreOwedMinor: summary.youAreOwedMinor,
        netMinor: summary.youAreOwedMinor - summary.youOweMinor,
      },
      suggestions: summary.suggestions.slice(0, 8),
      activity,
      pendingInvitationCount: pendingInvitationRows.length,
    }
  }
)

export const getGroupsPageData = createServerFn({ method: "GET" }).handler(
  async () => {
    const currentUser = await requireLedgerUser()
    enforceRateLimit({
      key: `groups-page:${currentUser.id}`,
      windowMs: 60_000,
      max: 100,
    })

    const [groups, friends] = await Promise.all([
      getUserGroups(currentUser.id),
      getUserFriends(currentUser.id),
    ])

    const friendCandidateMap = new Map<
      string,
      {
        id: string
        name: string
        email: string
      }
    >()

    for (const friend of friends) {
      if (!friendCandidateMap.has(friend.otherUser.id)) {
        friendCandidateMap.set(friend.otherUser.id, {
          id: friend.otherUser.id,
          name: friend.otherUser.name,
          email: friend.otherUser.email,
        })
      }
    }

    return {
      user: currentUser,
      groups,
      friendCandidates: Array.from(friendCandidateMap.values()).sort((a, b) =>
        a.name.localeCompare(b.name)
      ),
    }
  }
)

export const getGroupDetailsData = createServerFn({ method: "GET" })
  .inputValidator((input: { groupId: string }) => input)
  .handler(async ({ data }) => {
    const currentUser = await requireLedgerUser()
    enforceRateLimit({
      key: `group-details:${currentUser.id}:${data.groupId}`,
      windowMs: 60_000,
      max: 150,
    })

    const [membershipRows, groupRows] = await Promise.all([
      db
        .select({ role: member.role })
        .from(member)
        .where(
          and(
            eq(member.organizationId, data.groupId),
            eq(member.userId, currentUser.id)
          )
        )
        .limit(1),
      db
        .select({
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
        })
        .from(organization)
        .where(eq(organization.id, data.groupId))
        .limit(1),
    ])

    const membership = membershipRows.at(0)
    if (!membership) {
      throw new Error("You are not a member of this group.")
    }

    const group = groupRows.at(0)
    if (!group) {
      throw new Error("Group not found.")
    }

    const [
      members,
      expenseRows,
      settlementRows,
      recentExpenseRows,
      friends,
      activity,
    ] = await Promise.all([
      getGroupMembers(data.groupId),
      db
        .select({
          paidByUserId: expense.paidByUserId,
          participantUserId: expenseParticipant.userId,
          owedAmountMinor: expenseParticipant.owedAmountMinor,
        })
        .from(expenseParticipant)
        .innerJoin(expense, eq(expenseParticipant.expenseId, expense.id))
        .where(eq(expense.organizationId, data.groupId)),
      getScopedSettlementImpactRows({ groupIds: [data.groupId] }),
      db
        .select({
          id: expense.id,
          title: expense.title,
          totalAmountMinor: expense.totalAmountMinor,
          currency: expense.currency,
          splitMethod: expense.splitMethod,
          incurredAt: expense.incurredAt,
          paidByUserId: expense.paidByUserId,
          paidByName: user.name,
        })
        .from(expense)
        .innerJoin(user, eq(expense.paidByUserId, user.id))
        .where(eq(expense.organizationId, data.groupId))
        .orderBy(desc(expense.incurredAt), desc(expense.id))
        .limit(GROUP_EXPENSE_PAGE_SIZE + 1),
      getUserFriends(currentUser.id),
      getAccessibleActivities([data.groupId], [], 24),
    ])

    const net = buildNetMap(expenseRows, settlementRows)
    const transfers = simplifyNetBalances(net)
    const memberLookup = new Map(members.map((entry) => [entry.id, entry]))
    const friendCandidateMap = new Map<
      string,
      {
        id: string
        name: string
        email: string
      }
    >()

    for (const friend of friends) {
      if (!friendCandidateMap.has(friend.otherUser.id)) {
        friendCandidateMap.set(friend.otherUser.id, {
          id: friend.otherUser.id,
          name: friend.otherUser.name,
          email: friend.otherUser.email,
        })
      }
    }

    const hasMoreRecentExpenses =
      recentExpenseRows.length > GROUP_EXPENSE_PAGE_SIZE
    const visibleRecentExpenseRows = recentExpenseRows.slice(
      0,
      GROUP_EXPENSE_PAGE_SIZE
    )
    const recentExpenseImpactMap = await getExpenseImpactLookup(
      currentUser.id,
      visibleRecentExpenseRows.map((entry) => entry.id)
    )
    const recentExpenses = visibleRecentExpenseRows.map((entry) => ({
      ...entry,
      incurredAt: safeDate(entry.incurredAt),
      expenseImpact: recentExpenseImpactMap.get(entry.id) ?? null,
    }))

    return {
      user: currentUser,
      group,
      viewerRole: getPrimaryMemberRole(membership.role),
      canManageMembers: canManageGroupMembers(membership.role),
      friendCandidates: Array.from(friendCandidateMap.values()).sort((a, b) =>
        a.name.localeCompare(b.name)
      ),
      members,
      balances: members.map((entry) => ({
        userId: entry.id,
        name: entry.name,
        netMinor: net.get(entry.id) ?? 0,
      })),
      transfers: transfers.map((entry) => ({
        ...entry,
        payerName: memberLookup.get(entry.payerUserId)?.name ?? "Unknown user",
        payeeName: memberLookup.get(entry.payeeUserId)?.name ?? "Unknown user",
      })),
      recentExpenses,
      recentExpensesHasMore: hasMoreRecentExpenses,
      activity,
    }
  })

export const getGroupExpensesPage = createServerFn({ method: "GET" })
  .inputValidator(
    (input: { groupId: string; offset?: number; limit?: number }) => input
  )
  .handler(async ({ data }) => {
    const currentUser = await requireLedgerUser()
    enforceRateLimit({
      key: `group-expenses-page:${currentUser.id}:${data.groupId}`,
      windowMs: 60_000,
      max: 240,
    })

    const groupId = data.groupId.trim()
    if (!groupId) {
      throw new Error("Group id is required.")
    }

    await assertGroupAccess(currentUser.id, groupId)

    const offset = Math.max(0, Math.floor(data.offset ?? 0))
    const requestedLimit = Math.max(
      1,
      Math.min(data.limit ?? GROUP_EXPENSE_PAGE_SIZE, 40)
    )

    const rows = await db
      .select({
        id: expense.id,
        title: expense.title,
        totalAmountMinor: expense.totalAmountMinor,
        currency: expense.currency,
        splitMethod: expense.splitMethod,
        incurredAt: expense.incurredAt,
        paidByUserId: expense.paidByUserId,
        paidByName: user.name,
      })
      .from(expense)
      .innerJoin(user, eq(expense.paidByUserId, user.id))
      .where(eq(expense.organizationId, groupId))
      .orderBy(desc(expense.incurredAt), desc(expense.id))
      .limit(requestedLimit + 1)
      .offset(offset)

    const hasMore = rows.length > requestedLimit
    const visibleRows = rows.slice(0, requestedLimit)
    const expenseImpactMap = await getExpenseImpactLookup(
      currentUser.id,
      visibleRows.map((entry) => entry.id)
    )

    return {
      expenses: visibleRows.map((entry) => ({
        ...entry,
        incurredAt: safeDate(entry.incurredAt),
        expenseImpact: expenseImpactMap.get(entry.id) ?? null,
      })),
      hasMore,
    }
  })

export const getGroupSettingsData = createServerFn({ method: "GET" })
  .inputValidator((input: { groupId: string }) => input)
  .handler(async ({ data }) => {
    const currentUser = await requireLedgerUser()
    enforceRateLimit({
      key: `group-settings:${currentUser.id}:${data.groupId}`,
      windowMs: 60_000,
      max: 120,
    })

    const [membershipRows, groupRows] = await Promise.all([
      db
        .select({ role: member.role })
        .from(member)
        .where(
          and(
            eq(member.organizationId, data.groupId),
            eq(member.userId, currentUser.id)
          )
        )
        .limit(1),
      db
        .select({
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
        })
        .from(organization)
        .where(eq(organization.id, data.groupId))
        .limit(1),
    ])

    const membership = membershipRows.at(0)
    if (!membership) {
      throw new Error("You are not a member of this group.")
    }

    const group = groupRows.at(0)
    if (!group) {
      throw new Error("Group not found.")
    }

    const friends = await getUserFriends(currentUser.id)

    const friendCandidateMap = new Map<
      string,
      {
        id: string
        name: string
        email: string
      }
    >()

    for (const friend of friends) {
      if (!friendCandidateMap.has(friend.otherUser.id)) {
        friendCandidateMap.set(friend.otherUser.id, {
          id: friend.otherUser.id,
          name: friend.otherUser.name,
          email: friend.otherUser.email,
        })
      }
    }

    return {
      group,
      viewerRole: getPrimaryMemberRole(membership.role),
      canManageMembers: canManageGroupMembers(membership.role),
      friendCandidates: Array.from(friendCandidateMap.values()).sort((a, b) =>
        a.name.localeCompare(b.name)
      ),
    }
  })

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

export const getFriendsPageData = createServerFn({ method: "GET" }).handler(
  async () => {
    const currentUser = await requireLedgerUser()
    enforceRateLimit({
      key: `friends-page:${currentUser.id}`,
      windowMs: 60_000,
      max: 100,
    })

    const [groups, friends] = await Promise.all([
      getUserGroups(currentUser.id),
      getUserFriends(currentUser.id),
    ])
    const friendIds = friends.map((entry) => entry.id)
    const summary = await getPairwiseSummary(
      currentUser.id,
      groups.map((entry) => entry.id),
      friendIds
    )

    const suggestionMap = new Map(
      summary.suggestions.map((entry) => [entry.counterparty.id, entry])
    )

    return {
      user: currentUser,
      friends: friends.map((entry) => ({
        ...entry,
        summary: suggestionMap.get(entry.otherUser.id)
          ? {
              direction: suggestionMap.get(entry.otherUser.id)!.direction,
              amountMinor: suggestionMap.get(entry.otherUser.id)!.amountMinor,
            }
          : null,
      })),
    }
  }
)

export const getFriendDetailsData = createServerFn({ method: "GET" })
  .inputValidator(
    (input: { friendId: string; offset?: number; limit?: number }) => input
  )
  .handler(async ({ data }) => {
    const currentUser = await requireLedgerUser()
    enforceRateLimit({
      key: `friend-details:${currentUser.id}:${data.friendId}`,
      windowMs: 60_000,
      max: 240,
    })

    const friendId = data.friendId.trim()
    if (!friendId) {
      throw new Error("Friend id is required.")
    }

    const { members, counterpartId } = await getFriendContextForUser(
      currentUser.id,
      friendId
    )
    const counterpart = members.find((entry) => entry.id === counterpartId)
    if (!counterpart) {
      throw new Error("Friend ledger is unavailable.")
    }

    const sharedGroupIds = await getSharedGroupIdsBetweenUsers(
      currentUser.id,
      counterpartId
    )

    const offset = Math.max(0, Math.floor(data.offset ?? 0))
    const requestedLimit = Math.max(
      1,
      Math.min(data.limit ?? FRIEND_EXPENSE_PAGE_SIZE, 40)
    )

    const scopeClauses = [eq(expense.friendLinkId, friendId)]
    if (sharedGroupIds.length > 0) {
      scopeClauses.push(inArray(expense.organizationId, sharedGroupIds))
    }

    const counterpartOwedExpenseIds = db
      .select({ expenseId: expenseParticipant.expenseId })
      .from(expenseParticipant)
      .where(
        and(
          eq(expenseParticipant.userId, counterpart.id),
          gt(expenseParticipant.owedAmountMinor, 0)
        )
      )

    const currentUserOwedExpenseIds = db
      .select({ expenseId: expenseParticipant.expenseId })
      .from(expenseParticipant)
      .where(
        and(
          eq(expenseParticipant.userId, currentUser.id),
          gt(expenseParticipant.owedAmountMinor, 0)
        )
      )

    const rows = await db
      .select({
        id: expense.id,
        title: expense.title,
        totalAmountMinor: expense.totalAmountMinor,
        incurredAt: expense.incurredAt,
        paidByUserId: expense.paidByUserId,
        paidByName: user.name,
        organizationId: expense.organizationId,
        organizationName: organization.name,
      })
      .from(expense)
      .innerJoin(user, eq(expense.paidByUserId, user.id))
      .leftJoin(organization, eq(expense.organizationId, organization.id))
      .where(
        and(
          scopeClauses.length === 1 ? scopeClauses[0] : or(...scopeClauses),
          or(
            and(
              eq(expense.paidByUserId, currentUser.id),
              inArray(expense.id, counterpartOwedExpenseIds)
            ),
            and(
              eq(expense.paidByUserId, counterpart.id),
              inArray(expense.id, currentUserOwedExpenseIds)
            )
          )
        )
      )
      .orderBy(desc(expense.incurredAt), desc(expense.id))
      .limit(requestedLimit + 1)
      .offset(offset)

    const hasMore = rows.length > requestedLimit
    const visibleRows = rows.slice(0, requestedLimit)
    const expenseIds = visibleRows.map((entry) => entry.id)

    const participantRows =
      expenseIds.length === 0
        ? []
        : await db
            .select({
              expenseId: expenseParticipant.expenseId,
              userId: expenseParticipant.userId,
              owedAmountMinor: expenseParticipant.owedAmountMinor,
            })
            .from(expenseParticipant)
            .where(
              and(
                inArray(expenseParticipant.expenseId, expenseIds),
                inArray(expenseParticipant.userId, [
                  currentUser.id,
                  counterpart.id,
                ])
              )
            )

    const owedByExpenseMap = new Map<
      string,
      {
        currentUserOwedMinor: number
        counterpartOwedMinor: number
      }
    >()

    for (const row of participantRows) {
      const current = owedByExpenseMap.get(row.expenseId) ?? {
        currentUserOwedMinor: 0,
        counterpartOwedMinor: 0,
      }

      if (row.userId === currentUser.id) {
        current.currentUserOwedMinor = row.owedAmountMinor
      } else if (row.userId === counterpart.id) {
        current.counterpartOwedMinor = row.owedAmountMinor
      }

      owedByExpenseMap.set(row.expenseId, current)
    }

    const expenses: Array<FriendPairExpenseItem> = []

    for (const entry of visibleRows) {
      const owed = owedByExpenseMap.get(entry.id) ?? {
        currentUserOwedMinor: 0,
        counterpartOwedMinor: 0,
      }

      if (
        entry.paidByUserId === currentUser.id &&
        owed.counterpartOwedMinor > 0
      ) {
        expenses.push({
          ...entry,
          incurredAt: safeDate(entry.incurredAt),
          contextType: entry.organizationId ? "group" : "direct",
          contextName: entry.organizationId
            ? (entry.organizationName ?? "Group")
            : "Direct",
          pairImpact: {
            direction: "collect",
            amountMinor: owed.counterpartOwedMinor,
          },
        })
        continue
      }

      if (
        entry.paidByUserId === counterpart.id &&
        owed.currentUserOwedMinor > 0
      ) {
        expenses.push({
          ...entry,
          incurredAt: safeDate(entry.incurredAt),
          contextType: entry.organizationId ? "group" : "direct",
          contextName: entry.organizationId
            ? (entry.organizationName ?? "Group")
            : "Direct",
          pairImpact: {
            direction: "pay",
            amountMinor: owed.currentUserOwedMinor,
          },
        })
      }
    }

    return {
      user: currentUser,
      friend: counterpart,
      expenses,
      hasMore,
    }
  })

export const getActivityPageData = createServerFn({ method: "GET" }).handler(
  async () => {
    const currentUser = await requireLedgerUser()
    enforceRateLimit({
      key: `activity-page:${currentUser.id}`,
      windowMs: 60_000,
      max: 120,
    })

    const [groups, friends] = await Promise.all([
      getUserGroups(currentUser.id),
      getUserFriends(currentUser.id),
    ])

    const baseActivity = await getAccessibleActivities(
      groups.map((entry) => entry.id),
      friends.map((entry) => entry.id),
      50
    )
    const activity = await attachExpenseActivityImpacts(
      baseActivity,
      currentUser.id
    )

    return {
      user: currentUser,
      activity,
    }
  }
)

export const getAccountPageData = createServerFn({ method: "GET" }).handler(
  async () => {
    const currentUser = await requireLedgerUser()
    enforceRateLimit({
      key: `account-page:${currentUser.id}`,
      windowMs: 60_000,
      max: 100,
    })

    const [groups, friends, invitations] = await Promise.all([
      getUserGroups(currentUser.id),
      getUserFriends(currentUser.id),
      getPendingInvitationsForUser(currentUser.email),
    ])

    return {
      user: currentUser,
      stats: {
        groupCount: groups.length,
        friendCount: friends.length,
      },
      invitations,
    }
  }
)

export const getComposerData = createServerFn({ method: "GET" }).handler(
  async () => {
    const currentUser = await requireLedgerUser()
    enforceRateLimit({
      key: `composer-data:${currentUser.id}`,
      windowMs: 60_000,
      max: 120,
    })

    const [groups, friends] = await Promise.all([
      getUserGroups(currentUser.id),
      getUserFriends(currentUser.id),
    ])

    return {
      user: currentUser,
      groups,
      friends,
    }
  }
)

export const getLedgerMembers = createServerFn({ method: "GET" })
  .inputValidator(
    (input: { contextType: LedgerContextType; contextId: string }) => input
  )
  .handler(async ({ data }) => {
    const currentUser = await requireLedgerUser()
    enforceRateLimit({
      key: `composer-members:${currentUser.id}:${data.contextType}:${data.contextId}`,
      windowMs: 60_000,
      max: 240,
    })

    const contextId = data.contextId.trim()
    if (!contextId) {
      throw new Error("Choose a ledger first.")
    }

    if (data.contextType === "group") {
      await assertGroupAccess(currentUser.id, contextId)
      return {
        members: await getGroupMembers(contextId),
      }
    }

    const { members } = await getFriendContextForUser(currentUser.id, contextId)
    return {
      members,
    }
  })

export const getSettlementComposerData = createServerFn({
  method: "GET",
}).handler(async () => {
  if (!settlementsEnabled) {
    throw new Error(settlementsDisabledMessage)
  }

  const currentUser = await requireLedgerUser()
  enforceRateLimit({
    key: `settlement-composer:${currentUser.id}`,
    windowMs: 60_000,
    max: 120,
  })

  const [groups, friends, counterparties] = await Promise.all([
    getUserGroups(currentUser.id),
    getUserFriends(currentUser.id),
    getSettlementCounterparties(currentUser.id),
  ])

  const summary = await getPairwiseSummary(
    currentUser.id,
    groups.map((entry) => entry.id),
    friends.map((entry) => entry.id)
  )

  return {
    user: currentUser,
    counterparties,
    suggestions: summary.suggestions.slice(0, 8),
  }
})

export const previewSettlement = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      counterpartyUserId: string
      payerUserId: string
      payeeUserId: string
      amountMinor: number
    }) => input
  )
  .handler(async ({ data }) => {
    if (!settlementsEnabled) {
      throw new Error(settlementsDisabledMessage)
    }

    const currentUser = await requireLedgerUser()
    enforceRateLimit({
      key: `preview-settlement:${currentUser.id}`,
      windowMs: 60_000,
      max: 80,
    })

    const plan = await preparePairwiseSettlementPlan({
      currentUserId: currentUser.id,
      counterpartyUserId: data.counterpartyUserId,
      payerUserId: data.payerUserId,
      payeeUserId: data.payeeUserId,
      amountMinor: data.amountMinor,
    })

    return {
      counterparty: plan.counterparty,
      outstandingTotal: plan.outstandingTotal,
      allocations: plan.allocations,
    }
  })

export const getExpenseDetailsData = createServerFn({ method: "GET" })
  .inputValidator((input: { expenseId: string }) => input)
  .handler(async ({ data }) => {
    const currentUser = await requireLedgerUser()
    enforceRateLimit({
      key: `expense-details:${currentUser.id}:${data.expenseId}`,
      windowMs: 60_000,
      max: 180,
    })

    const expenseId = data.expenseId.trim()
    if (!expenseId) {
      throw new Error("Expense id is required.")
    }

    const context = await getExpenseContextForUser(currentUser.id, expenseId)

    const participantRows = await db
      .select({
        userId: expenseParticipant.userId,
        name: user.name,
        email: user.email,
        paidAmountMinor: expenseParticipant.paidAmountMinor,
        owedAmountMinor: expenseParticipant.owedAmountMinor,
      })
      .from(expenseParticipant)
      .innerJoin(user, eq(expenseParticipant.userId, user.id))
      .where(eq(expenseParticipant.expenseId, context.expenseRow.id))
      .orderBy(user.name)

    let splitInput: Array<SplitInputLine> = []
    if (context.expenseRow.splitMeta) {
      try {
        const parsed = JSON.parse(context.expenseRow.splitMeta)
        if (Array.isArray(parsed)) {
          const lines: Array<SplitInputLine> = []
          for (const entry of parsed) {
            const userId = typeof entry?.userId === "string" ? entry.userId : ""
            if (!userId) {
              continue
            }

            const value =
              typeof entry?.value === "number" && Number.isFinite(entry.value)
                ? entry.value
                : undefined

            lines.push({ userId, value })
          }

          splitInput = lines
        }
      } catch {
        splitInput = []
      }
    }

    return {
      context: {
        type: context.contextType,
        id: context.contextId,
        name: context.contextName,
      },
      expense: {
        id: context.expenseRow.id,
        title: context.expenseRow.title,
        description: context.expenseRow.description ?? "",
        currency: context.expenseRow.currency,
        totalAmountMinor: context.expenseRow.totalAmountMinor,
        splitMethod: context.expenseRow.splitMethod as ExpenseSplitMethod,
        incurredAt: safeDate(context.expenseRow.incurredAt),
        createdAt: safeDate(context.expenseRow.createdAt),
        updatedAt: safeDate(context.expenseRow.updatedAt),
        paidByUserId: context.expenseRow.paidByUserId,
        paidByName: context.expenseRow.paidByName,
      },
      members: context.members,
      splitInput,
      participants: participantRows.map((entry) => ({
        ...entry,
        netMinor: entry.paidAmountMinor - entry.owedAmountMinor,
      })),
      permissions: {
        canEdit: canManageExpense(
          currentUser.id,
          context.expenseRow.createdByUserId
        ),
        canDelete: canManageExpense(
          currentUser.id,
          context.expenseRow.createdByUserId
        ),
      },
    }
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

    const users = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
      })
      .from(user)
      .where(eq(user.email, email))
      .limit(1)

    const targetUser = users.at(0)
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

export const createFriendLedger = createServerFn({ method: "POST" })
  .inputValidator((input: { email: string }) => input)
  .handler(async ({ data }) => {
    const currentUser = await requireLedgerUser()
    enforceRateLimit({
      key: `create-friend:${currentUser.id}`,
      windowMs: 60_000,
      max: 18,
    })

    const email = data.email.trim().toLowerCase()
    if (!email) {
      throw new Error("Email is required.")
    }

    const users = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
      })
      .from(user)
      .where(eq(user.email, email))
      .limit(1)

    const targetUser = users.at(0)
    if (!targetUser) {
      throw new Error("No Batwara user was found for this email.")
    }

    if (targetUser.id === currentUser.id) {
      throw new Error(
        "You cannot create a friend ledger with your own account."
      )
    }

    const pairKey = normalizePairKey(currentUser.id, targetUser.id)
    const existing = await db
      .select({
        id: friendLink.id,
      })
      .from(friendLink)
      .where(eq(friendLink.pairKey, pairKey))
      .limit(1)

    if (existing[0]) {
      return {
        friendLinkId: existing[0].id,
        alreadyExists: true,
      }
    }

    const friendLinkId = crypto.randomUUID()
    await db.transaction(async (tx) => {
      await tx.insert(friendLink).values({
        id: friendLinkId,
        pairKey,
        userAId:
          currentUser.id < targetUser.id ? currentUser.id : targetUser.id,
        userBId:
          currentUser.id < targetUser.id ? targetUser.id : currentUser.id,
        status: "active",
        createdByUserId: currentUser.id,
      })

      await tx.insert(activityLog).values({
        id: crypto.randomUUID(),
        friendLinkId,
        actorUserId: currentUser.id,
        entityType: "friend_link",
        entityId: friendLinkId,
        action: "created",
        summary: `${currentUser.name} added ${targetUser.name} to a direct ledger.`,
        createdAt: new Date(),
      })
    })

    return {
      friendLinkId,
      alreadyExists: false,
    }
  })

export const createExpense = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      contextType: LedgerContextType
      contextId: string
      title: string
      description?: string
      currency?: string
      totalAmountMinor: number
      paidByUserId: string
      splitMethod: ExpenseSplitMethod
      participants: Array<SplitInputLine>
      incurredAt?: string
    }) => input
  )
  .handler(async ({ data }) => {
    const currentUser = await requireLedgerUser()
    enforceRateLimit({
      key: `create-expense:${currentUser.id}`,
      windowMs: 60_000,
      max: 40,
    })

    const contextType = data.contextType
    const contextId = data.contextId
    const title = data.title.trim()
    const totalAmountMinor = toMinorUnits(data.totalAmountMinor)
    const normalizedIncurredAt = parseDayInputAtUtcMidday(data.incurredAt)

    if (!contextId) {
      throw new Error("Choose where this expense belongs.")
    }

    if (!title) {
      throw new Error("Expense title is required.")
    }

    if (totalAmountMinor <= 0) {
      throw new Error("Expense amount must be more than zero.")
    }

    let members: Array<ContextMember>
    if (contextType === "group") {
      await assertGroupAccess(currentUser.id, contextId)
      members = await getGroupMembers(contextId)
    } else {
      members = (await getFriendContextForUser(currentUser.id, contextId))
        .members
    }
    const memberIds = new Set(members.map((entry) => entry.id))

    if (!memberIds.has(data.paidByUserId)) {
      throw new Error("Payer must belong to the selected ledger.")
    }

    const splitLines = resolveSplit(
      totalAmountMinor,
      data.splitMethod,
      data.participants
    )

    for (const line of splitLines) {
      if (!memberIds.has(line.userId)) {
        throw new Error("Participant list includes a user outside this ledger.")
      }
    }

    const expenseId = crypto.randomUUID()
    const now = new Date()
    const normalizedCurrency = toCurrencyCode(data.currency)

    await db.transaction(async (tx) => {
      await tx.insert(expense).values({
        id: expenseId,
        organizationId: contextType === "group" ? contextId : null,
        friendLinkId: contextType === "friend" ? contextId : null,
        createdByUserId: currentUser.id,
        paidByUserId: data.paidByUserId,
        title,
        description: data.description?.trim() || null,
        currency: normalizedCurrency,
        totalAmountMinor,
        splitMethod: data.splitMethod,
        splitMeta: JSON.stringify(data.participants),
        incurredAt: normalizedIncurredAt ?? now,
        createdAt: now,
        updatedAt: now,
      })

      await tx.insert(expenseParticipant).values(
        splitLines.map((line) => ({
          id: crypto.randomUUID(),
          expenseId,
          userId: line.userId,
          paidAmountMinor:
            line.userId === data.paidByUserId ? totalAmountMinor : 0,
          owedAmountMinor: line.owedAmountMinor,
          createdAt: now,
        }))
      )

      await tx.insert(activityLog).values({
        id: crypto.randomUUID(),
        organizationId: contextType === "group" ? contextId : null,
        friendLinkId: contextType === "friend" ? contextId : null,
        actorUserId: currentUser.id,
        entityType: "expense",
        entityId: expenseId,
        action: "created",
        summary: `${currentUser.name} added "${title}".`,
        metadata: JSON.stringify({
          totalAmountMinor,
          currency: normalizedCurrency,
          splitMethod: data.splitMethod,
        }),
        createdAt: now,
      })
    })

    return {
      expenseId,
    }
  })

export const updateExpense = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      expenseId: string
      title: string
      description?: string
      currency?: string
      totalAmountMinor: number
      paidByUserId: string
      splitMethod: ExpenseSplitMethod
      participants: Array<SplitInputLine>
      incurredAt?: string
    }) => input
  )
  .handler(async ({ data }) => {
    const currentUser = await requireLedgerUser()
    enforceRateLimit({
      key: `update-expense:${currentUser.id}`,
      windowMs: 60_000,
      max: 80,
    })

    const expenseId = data.expenseId.trim()
    if (!expenseId) {
      throw new Error("Expense id is required.")
    }

    const context = await getExpenseContextForUser(currentUser.id, expenseId)

    const title = data.title.trim()
    const totalAmountMinor = toMinorUnits(data.totalAmountMinor)
    const normalizedIncurredAt = parseDayInputAtUtcMidday(data.incurredAt)
    const canManage = canManageExpense(
      currentUser.id,
      context.expenseRow.createdByUserId
    )

    if (!title) {
      throw new Error("Expense title is required.")
    }

    if (totalAmountMinor <= 0) {
      throw new Error("Expense amount must be more than zero.")
    }

    if (!canManage) {
      throw new Error("You cannot edit this expense.")
    }

    const memberIds = new Set(context.members.map((entry) => entry.id))
    if (!memberIds.has(data.paidByUserId)) {
      throw new Error("Payer must belong to the selected ledger.")
    }

    const splitLines = resolveSplit(
      totalAmountMinor,
      data.splitMethod,
      data.participants
    )

    for (const line of splitLines) {
      if (!memberIds.has(line.userId)) {
        throw new Error("Participant list includes a user outside this ledger.")
      }
    }

    const normalizedCurrency = toCurrencyCode(data.currency)
    const now = new Date()

    await db.transaction(async (tx) => {
      await tx
        .update(expense)
        .set({
          title,
          description: data.description?.trim() || null,
          currency: normalizedCurrency,
          totalAmountMinor,
          paidByUserId: data.paidByUserId,
          splitMethod: data.splitMethod,
          splitMeta: JSON.stringify(data.participants),
          incurredAt: normalizedIncurredAt ?? now,
          updatedAt: now,
        })
        .where(eq(expense.id, context.expenseRow.id))

      await tx
        .delete(expenseParticipant)
        .where(eq(expenseParticipant.expenseId, context.expenseRow.id))

      await tx.insert(expenseParticipant).values(
        splitLines.map((line) => ({
          id: crypto.randomUUID(),
          expenseId: context.expenseRow.id,
          userId: line.userId,
          paidAmountMinor:
            line.userId === data.paidByUserId ? totalAmountMinor : 0,
          owedAmountMinor: line.owedAmountMinor,
          createdAt: now,
        }))
      )

      await tx.insert(activityLog).values({
        id: crypto.randomUUID(),
        organizationId:
          context.contextType === "group" ? context.contextId : null,
        friendLinkId:
          context.contextType === "friend" ? context.contextId : null,
        actorUserId: currentUser.id,
        entityType: "expense",
        entityId: context.expenseRow.id,
        action: "updated",
        summary: `${currentUser.name} updated "${title}".`,
        metadata: JSON.stringify({
          title,
          totalAmountMinor,
          currency: normalizedCurrency,
          splitMethod: data.splitMethod,
        }),
        createdAt: now,
      })
    })

    return {
      expenseId: context.expenseRow.id,
    }
  })

export const deleteExpense = createServerFn({ method: "POST" })
  .inputValidator((input: { expenseId: string }) => input)
  .handler(async ({ data }) => {
    const currentUser = await requireLedgerUser()
    enforceRateLimit({
      key: `delete-expense:${currentUser.id}`,
      windowMs: 60_000,
      max: 80,
    })

    const expenseId = data.expenseId.trim()
    if (!expenseId) {
      throw new Error("Expense id is required.")
    }

    const context = await getExpenseContextForUser(currentUser.id, expenseId)
    const canManage = canManageExpense(
      currentUser.id,
      context.expenseRow.createdByUserId
    )

    if (!canManage) {
      throw new Error("You cannot delete this expense.")
    }

    const participantRows = await db
      .select({
        userId: expenseParticipant.userId,
        name: user.name,
        paidAmountMinor: expenseParticipant.paidAmountMinor,
        owedAmountMinor: expenseParticipant.owedAmountMinor,
      })
      .from(expenseParticipant)
      .innerJoin(user, eq(expenseParticipant.userId, user.id))
      .where(eq(expenseParticipant.expenseId, context.expenseRow.id))
      .orderBy(user.name)

    const now = new Date()
    const amountLabel = new Intl.NumberFormat("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(context.expenseRow.totalAmountMinor / 100)

    await db.transaction(async (tx) => {
      await tx.delete(expense).where(eq(expense.id, context.expenseRow.id))

      await tx.insert(activityLog).values({
        id: crypto.randomUUID(),
        organizationId:
          context.contextType === "group" ? context.contextId : null,
        friendLinkId:
          context.contextType === "friend" ? context.contextId : null,
        actorUserId: currentUser.id,
        entityType: "expense",
        entityId: context.expenseRow.id,
        action: "deleted",
        summary: `${currentUser.name} deleted expense "${context.expenseRow.title}" (${amountLabel}).`,
        metadata: JSON.stringify({
          deletedExpense: {
            id: context.expenseRow.id,
            title: context.expenseRow.title,
            description: context.expenseRow.description,
            currency: context.expenseRow.currency,
            totalAmountMinor: context.expenseRow.totalAmountMinor,
            splitMethod: context.expenseRow.splitMethod,
            incurredAt: context.expenseRow.incurredAt,
            paidByUserId: context.expenseRow.paidByUserId,
            paidByName: context.expenseRow.paidByName,
            contextType: context.contextType,
            contextId: context.contextId,
            participants: participantRows,
            deletedByUserId: currentUser.id,
            deletedByName: currentUser.name,
          },
        }),
        createdAt: now,
      })
    })

    return {
      expenseId: context.expenseRow.id,
    }
  })

function parseSettlementDateInput(value: string | undefined) {
  if (!value) {
    return null
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("Settlement date is invalid.")
  }

  // Persist day-only inputs at midday to avoid timezone rollovers.
  const parsed = new Date(`${value}T12:00:00`)
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Settlement date is invalid.")
  }

  return parsed
}

export const createSettlement = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      counterpartyUserId: string
      payerUserId: string
      payeeUserId: string
      amountMinor: number
      currency?: string
      note?: string
      settledAt?: string
    }) => input
  )
  .handler(async ({ data }) => {
    if (!settlementsEnabled) {
      throw new Error(settlementsDisabledMessage)
    }

    const currentUser = await requireLedgerUser()
    enforceRateLimit({
      key: `create-settlement:${currentUser.id}`,
      windowMs: 60_000,
      max: 35,
    })

    const plan = await preparePairwiseSettlementPlan({
      currentUserId: currentUser.id,
      counterpartyUserId: data.counterpartyUserId,
      payerUserId: data.payerUserId,
      payeeUserId: data.payeeUserId,
      amountMinor: data.amountMinor,
    })

    try {
      await db.transaction(async (tx) => {
        const settlementId = crypto.randomUUID()
        const now = new Date()
        const normalizedCurrency = toCurrencyCode(data.currency)
        const normalizedSettledAt =
          parseSettlementDateInput(data.settledAt) ?? now

        await tx.insert(settlement).values({
          id: settlementId,
          payerUserId: data.payerUserId,
          payeeUserId: data.payeeUserId,
          currency: normalizedCurrency,
          amountMinor: plan.amountMinor,
          note: data.note?.trim() || null,
          settledAt: normalizedSettledAt,
          createdByUserId: currentUser.id,
          createdAt: now,
        })

        await tx.insert(settlementAllocation).values(
          plan.allocations.map((entry) => ({
            id: crypto.randomUUID(),
            settlementId,
            organizationId: entry.scopeType === "group" ? entry.scopeId : null,
            friendLinkId: entry.scopeType === "friend" ? entry.scopeId : null,
            payerUserId: data.payerUserId,
            payeeUserId: data.payeeUserId,
            amountMinor: entry.amountMinor,
            allocationOrder: entry.allocationOrder,
            createdAt: now,
          }))
        )

        await tx.insert(activityLog).values(
          plan.allocations.map((entry) => ({
            id: crypto.randomUUID(),
            organizationId: entry.scopeType === "group" ? entry.scopeId : null,
            friendLinkId: entry.scopeType === "friend" ? entry.scopeId : null,
            actorUserId: currentUser.id,
            entityType: "settlement",
            entityId: settlementId,
            action: "created",
            summary:
              entry.scopeType === "group"
                ? `${currentUser.name} recorded a ${entry.scopeName} settlement.`
                : `${currentUser.name} recorded a direct settlement with ${plan.counterparty.name}.`,
            metadata: JSON.stringify({
              payerUserId: data.payerUserId,
              payeeUserId: data.payeeUserId,
              counterpartyUserId: plan.counterparty.id,
              amountMinor: plan.amountMinor,
              allocatedAmountMinor: entry.amountMinor,
              allocationOrder: entry.allocationOrder,
              currency: normalizedCurrency,
              scopeType: entry.scopeType,
              scopeName: entry.scopeName,
            }),
            createdAt: now,
          }))
        )
      })
    } catch (error) {
      if (isMissingSettlementAllocationTableError(error)) {
        throw new Error(
          'Database migration missing for settlements. Run "bun run db:migrate" and try again.'
        )
      }

      throw error
    }

    return {
      amountMinor: plan.amountMinor,
      allocations: plan.allocations,
    }
  })
