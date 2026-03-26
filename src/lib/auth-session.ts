import { getRequest } from "@tanstack/react-start/server"

import { auth } from "@/lib/auth"

type ServerAuthSession = Awaited<ReturnType<typeof auth.api.getSession>>

const sessionByRequest = new WeakMap<Request, Promise<ServerAuthSession>>()

export async function getServerAuthSession() {
  const request = getRequest()
  const cached = sessionByRequest.get(request)
  if (cached) {
    return cached
  }

  const pending = auth.api.getSession({
    headers: new Headers(request.headers),
  })
  sessionByRequest.set(request, pending)
  return pending
}
