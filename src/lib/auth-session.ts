import { getRequestHeaders } from "@tanstack/react-start/server"

import { auth } from "@/lib/auth"

export async function getServerAuthSession() {
  return auth.api.getSession({
    headers: new Headers(getRequestHeaders()),
  })
}
