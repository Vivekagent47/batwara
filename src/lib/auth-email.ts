type AuthEmailPayload = {
  to: string
  subject: string
  text: string
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

function formatDevEmailLog(payload: AuthEmailPayload) {
  return [
    "[Batwara Auth Email]",
    `To: ${payload.to}`,
    `Subject: ${payload.subject}`,
    "",
    payload.text,
  ].join("\n")
}

export function sendAuthEmail(payload: AuthEmailPayload) {
  const message = formatDevEmailLog(payload)
  const allowConsoleEmailInProduction = parseBoolean(
    process.env.BATWARA_ALLOW_CONSOLE_AUTH_EMAIL,
    false
  )

  if (process.env.NODE_ENV !== "production" || allowConsoleEmailInProduction) {
    process.stdout.write(`${message}\n\n`)
    console.log(message)
    return Promise.resolve()
  }

  throw new Error(
    "[Batwara Auth Email] Production email delivery is not configured. Wire a real provider before enabling production auth flows."
  )
}

export async function sendVerificationEmail(input: {
  email: string
  name?: string | null
  url: string
}) {
  const greeting = input.name ? `Hi ${input.name},` : "Hi,"

  await sendAuthEmail({
    to: input.email,
    subject: "Verify your Batwara email",
    text: [
      greeting,
      "",
      "Verify your Batwara account to start tracking shared expenses.",
      input.url,
      "",
      "If you did not create this account, you can ignore this email.",
    ].join("\n"),
  })
}

export async function sendPasswordResetEmail(input: {
  email: string
  name?: string | null
  url: string
}) {
  const greeting = input.name ? `Hi ${input.name},` : "Hi,"

  await sendAuthEmail({
    to: input.email,
    subject: "Reset your Batwara password",
    text: [
      greeting,
      "",
      "Use the link below to choose a new Batwara password.",
      input.url,
      "",
      "If you did not request this reset, you can ignore this email.",
    ].join("\n"),
  })
}
