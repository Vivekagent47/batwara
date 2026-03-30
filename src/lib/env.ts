function parseBooleanEnv(
  value: string | boolean | undefined,
  fallback: boolean
) {
  if (typeof value === "boolean") {
    return value
  }

  if (typeof value !== "string") {
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

export const appEnv = {
  appUrl: import.meta.env.VITE_APP_URL,
  enableDevtools: parseBooleanEnv(
    import.meta.env.VITE_ENABLE_DEVTOOLS,
    import.meta.env.DEV
  ),
} as const
