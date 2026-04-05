// Expense and composer reader functions.
import { eq } from "drizzle-orm"
import { createServerFn } from "@tanstack/react-start"

import { requireLedgerUser } from "./access"
import { safeDate } from "./core"
import { getExpenseContextForUser } from "./expenses"
import { getUserFriends } from "./friends"
import { getUserGroups } from "./groups"
import type { ExpenseSplitMethod, SplitInputLine } from "./types"
import { enforceRateLimit } from "@/lib/rate-limit"
import { canManageExpense } from "@/lib/expense-permissions"
import { expenseParticipant, user } from "@/db/schema"
import { db } from "@/db"

function parseSplitMeta(value: string | null): Array<SplitInputLine> {
  if (!value) {
    return []
  }

  try {
    const parsed = JSON.parse(value)
    if (!Array.isArray(parsed)) {
      return []
    }

    const lines: Array<SplitInputLine> = []
    for (const entry of parsed) {
      const userId = typeof entry?.userId === "string" ? entry.userId : ""
      if (!userId) {
        continue
      }

      const numericValue =
        typeof entry?.value === "number" && Number.isFinite(entry.value)
          ? entry.value
          : undefined

      lines.push({ userId, value: numericValue })
    }

    return lines
  } catch {
    return []
  }
}

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
      splitInput: parseSplitMeta(context.expenseRow.splitMeta),
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
