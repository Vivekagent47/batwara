// Activity feed reader functions.
import { createServerFn } from "@tanstack/react-start"

import { enforceRateLimit } from "@/lib/rate-limit"

import {
  attachExpenseActivityImpacts,
  getAccessibleActivities,
} from "./activity"
import { requireLedgerUser } from "./access"
import { getUserFriends } from "./friends"
import { getUserGroups } from "./groups"

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
