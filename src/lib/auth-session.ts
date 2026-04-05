import { createServerFn } from "@tanstack/react-start"
import { getRequest } from "@tanstack/react-start/server"

async function getSessionForRequest(request: Request) {
  const { auth } = await import("@/lib/auth")
  return auth.api.getSession({
    headers: new Headers(request.headers),
  })
}

type ServerAuthSession = Awaited<ReturnType<typeof getSessionForRequest>>

const sessionByRequest = new WeakMap<Request, Promise<ServerAuthSession>>()

export async function getServerAuthSession() {
  const request = getRequest()
  const cached = sessionByRequest.get(request)
  if (cached) {
    return cached
  }

  const pending = getSessionForRequest(request)
  sessionByRequest.set(request, pending)
  return pending
}

export const getLandingPageAuthState = createServerFn({
  method: "GET",
}).handler(async () => {
  const session = await getServerAuthSession()

  return {
    isAuthenticated: Boolean(session?.user),
  }
})
