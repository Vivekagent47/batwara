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
  enableInteractiveBackground: parseBooleanEnv(
    import.meta.env.VITE_ENABLE_INTERACTIVE_BACKGROUND,
    true
  ),
  enableHeroScene: parseBooleanEnv(import.meta.env.VITE_ENABLE_HERO_SCENE, true),
  enableHeroSceneOnMobile: parseBooleanEnv(
    import.meta.env.VITE_ENABLE_HERO_SCENE_ON_MOBILE,
    false
  ),
} as const
