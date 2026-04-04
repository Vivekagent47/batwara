import { createFileRoute } from "@tanstack/react-router"

async function handleAuthRequest(request: Request) {
  const { auth } = await import("@/lib/auth")
  return auth.handler(request)
}

export const Route = createFileRoute("/api/auth/$" as never)({
  server: {
    handlers: {
      GET: ({ request }) => handleAuthRequest(request),
      POST: ({ request }) => handleAuthRequest(request),
      PUT: ({ request }) => handleAuthRequest(request),
      PATCH: ({ request }) => handleAuthRequest(request),
      DELETE: ({ request }) => handleAuthRequest(request),
      OPTIONS: ({ request }) => handleAuthRequest(request),
    },
  },
})
