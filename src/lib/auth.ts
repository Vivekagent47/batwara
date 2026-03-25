import "dotenv/config"

import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { haveIBeenPwned, organization } from "better-auth/plugins"
import { tanstackStartCookies } from "better-auth/tanstack-start"

import { db } from "@/db"
import * as schema from "@/db/schema"
import { sendPasswordResetEmail, sendVerificationEmail } from "@/lib/auth-email"

const authBaseUrl =
  process.env.BETTER_AUTH_URL ||
  process.env.VITE_APP_URL ||
  "http://localhost:3000"

function parseList(value: string | undefined) {
  if (!value) {
    return []
  }

  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
}

function parseBoolean(value: string | undefined, fallback = false) {
  if (!value) {
    return fallback
  }

  const normalized = value.trim().toLowerCase()

  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true
  }

  if (["0", "false", "no", "off"].includes(normalized)) {
    return false
  }

  return fallback
}

function maskEmail(email: string) {
  const [localPart, domainPart] = email.split("@")

  if (!localPart || !domainPart) {
    return "unknown"
  }

  if (localPart.length <= 2) {
    return `**@${domainPart}`
  }

  return `${localPart.slice(0, 2)}***@${domainPart}`
}

function logAuthEmailAction(action: string, email: string) {
  const allowLogs =
    process.env.NODE_ENV !== "production" ||
    parseBoolean(process.env.BATWARA_AUTH_LOG_EMAIL_EVENTS, false)

  if (!allowLogs) {
    return
  }

  const safeEmail =
    process.env.NODE_ENV === "production" ? maskEmail(email) : email

  console.log(`[Batwara Auth] ${action} ${safeEmail}`)
}

const trustedOrigins = parseList(process.env.BETTER_AUTH_TRUSTED_ORIGINS)

export const auth = betterAuth({
  appName: "Batwara",
  baseURL: authBaseUrl,
  trustedOrigins: trustedOrigins.length > 0 ? trustedOrigins : undefined,
  secret: process.env.BETTER_AUTH_SECRET,
  rateLimit: {
    enabled: true,
    storage: "memory",
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 60, max: 10 },
      "/sign-up/email": { window: 120, max: 10 },
      "/send-verification-email": { window: 300, max: 5 },
      "/request-password-reset": { window: 300, max: 5 },
      "/reset-password": { window: 300, max: 10 },
    },
  },
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: false,
    revokeSessionsOnPasswordReset: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      logAuthEmailAction("Sending reset email to", user.email)
      await sendPasswordResetEmail({
        email: user.email,
        name: user.name,
        url,
      })
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: false,
    sendVerificationEmail: async ({ user, url }) => {
      logAuthEmailAction("Sending verification email to", user.email)
      await sendVerificationEmail({
        email: user.email,
        name: user.name,
        url,
      })
    },
  },
  plugins: [
    haveIBeenPwned(),
    tanstackStartCookies(),
    organization({
      requireEmailVerificationOnInvitation: true,
    }),
  ],
})
