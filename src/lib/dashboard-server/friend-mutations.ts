// Direct friend-ledger creation write functions.
import { eq } from "drizzle-orm"
import { createServerFn } from "@tanstack/react-start"

import { db } from "@/db"
import { activityLog, friendLink } from "@/db/schema"
import { enforceRateLimit } from "@/lib/rate-limit"

import { requireLedgerUser } from "./access"
import { findUserByEmail } from "./mutation-shared"
import { normalizePairKey } from "./core"

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

    const targetUser = await findUserByEmail(email)
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
