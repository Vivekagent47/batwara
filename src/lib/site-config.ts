import { appEnv } from "@/lib/env"

const FALLBACK_SITE_URL = "http://localhost:3000"

export const siteConfig = {
  name: "Batwara",
  title: "Batwara",
  description:
    "Batwara is an open-source expense splitting app for trips, roommates, couples, and shared life. Track group expenses, split bills, and settle balances with fewer payments.",
  appType:
    "Open-source expense splitting app, shared expense tracker, and split bills app for groups.",
  defaultUrl: appEnv.appUrl || FALLBACK_SITE_URL,
  socialImagePath: "/og-image.svg",
  manifestPath: "/manifest.json",
  keywords: [
    "expense splitting app",
    "split bills app",
    "shared expense tracker",
    "open source splitwise alternative",
    "roommate expense tracker",
    "trip expense tracker",
    "group expense app",
  ],
  githubUrl: "https://github.com/Vivekagent47/batwara",
} as const

export function getSiteUrl() {
  return appEnv.appUrl || siteConfig.defaultUrl
}

export function createAbsoluteUrl(path = "/") {
  return new URL(path, getSiteUrl()).toString()
}
