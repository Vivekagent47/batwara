import { settlementsDisabledMessage } from "@/lib/feature-flags-shared"

function parseBooleanEnv(value: string | undefined, fallback: boolean) {
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

const rawSettlementsFlag =
  process.env.BATWARA_ENABLE_SETTLEMENTS ?? process.env.VITE_ENABLE_SETTLEMENTS

export const settlementsEnabled = parseBooleanEnv(rawSettlementsFlag, false)

export { settlementsDisabledMessage }
