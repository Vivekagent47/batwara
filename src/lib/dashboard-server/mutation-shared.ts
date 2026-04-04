// Shared write-side lookup helpers.
import { eq } from "drizzle-orm"

import { db } from "@/db"
import { user } from "@/db/schema"

export async function findUserByEmail(email: string) {
  const users = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
    })
    .from(user)
    .where(eq(user.email, email))
    .limit(1)

  return users.at(0) ?? null
}
