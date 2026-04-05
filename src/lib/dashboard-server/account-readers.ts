// Account page reader functions.
import { createServerFn } from "@tanstack/react-start"

import { getPendingInvitationsForUser, requireLedgerUser } from "./access"
import { getUserFriends } from "./friends"
import { getUserGroups } from "./groups"
import { enforceRateLimit } from "@/lib/rate-limit"

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
