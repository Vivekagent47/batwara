// Expense-context helpers shared across expense readers and mutations.
import { eq } from "drizzle-orm"

import { assertGroupAccess } from "./access"
import { getFriendContextForUser } from "./friends"
import { getGroupMembers } from "./groups"
import { expense, organization, user } from "@/db/schema"
import { db } from "@/db"

export async function getExpenseContextForUser(
  userId: string,
  expenseId: string
) {
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
