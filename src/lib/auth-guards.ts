import { redirect } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"

import { getServerAuthSession } from "@/lib/auth-session"

export const requireAuthSession = createServerFn({ method: "GET" }).handler(
  async () => {
    const session = await getServerAuthSession()

    if (!session) {
      throw redirect({ to: "/login" })
    }

    return session
  }
)
