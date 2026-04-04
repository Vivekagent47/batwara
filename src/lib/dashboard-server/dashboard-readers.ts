// Dashboard home read models.
import { and, eq, gt } from "drizzle-orm"
import { createServerFn } from "@tanstack/react-start"

import { db } from "@/db"
import { invitation } from "@/db/schema"
import { enforceRateLimit } from "@/lib/rate-limit"

import { getAccessibleActivities } from "./activity"
import { getPairwiseSummary } from "./balances"
import { getUserFriends } from "./friends"
import { getUserGroups } from "./groups"
import { requireLedgerUser } from "./access"

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
