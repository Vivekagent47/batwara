// Expense create, update, and delete write functions.
import { eq } from "drizzle-orm"
import { createServerFn } from "@tanstack/react-start"

import { assertGroupAccess, requireLedgerUser } from "./access"
import { getExpenseContextForUser } from "./expenses"
import { getFriendContextForUser } from "./friends"
import { getGroupMembers } from "./groups"
import { resolveSplit, toCurrencyCode, toMinorUnits } from "./core"
import type {
  ExpenseSplitMethod,
  LedgerContextType,
  SplitInputLine,
} from "./types"
import { enforceRateLimit } from "@/lib/rate-limit"
import { canManageExpense } from "@/lib/expense-permissions"
import { parseDayInputAtUtcMidday } from "@/lib/date-only"
import { activityLog, expense, expenseParticipant, user } from "@/db/schema"
import { db } from "@/db"

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

    let members
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
