const rawSettlementsFlag =
  process.env.BATWARA_ENABLE_SETTLEMENTS || process.env.VITE_ENABLE_SETTLEMENTS

export const settlementsEnabled =
  typeof rawSettlementsFlag === "string" &&
  rawSettlementsFlag.trim().toLowerCase() === "true"

export const settlementsDisabledMessage =
  "Settlement is temporarily disabled. It will return in the final phase of v1."
