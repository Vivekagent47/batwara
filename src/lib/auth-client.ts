import { createAuthClient } from "better-auth/react"
import { organizationClient } from "better-auth/client/plugins"

import { appEnv } from "@/lib/env"

export const authClient = createAuthClient({
  baseURL: appEnv.appUrl,
  plugins: [organizationClient()],
})

export function getAuthErrorMessage(error: unknown) {
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message
  }

  return "Something went wrong. Please try again."
}
