import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router"
import { useEffect, useState } from "react"
import { toast } from "sonner"

import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { Button } from "@/components/ui/button"
import { authClient, getAuthErrorMessage } from "@/lib/auth-client"
import { getAccountPageData } from "@/lib/dashboard-server"

export const Route = createFileRoute("/account/")({
  loader: () => getAccountPageData(),
  head: () => ({
    meta: [
      {
        title: "Account | Batwara",
      },
      {
        name: "robots",
        content: "noindex,nofollow",
      },
    ],
  }),
  component: AccountPage,
})

type PendingInvitationRow = {
  id: string
  organizationName: string
  invitedEmail: string
  role: string
  createdAt: Date
  expiresAt: Date | null
}

function safeDate(value: unknown) {
  if (value instanceof Date) {
    return value
  }

  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) {
      return parsed
    }
  }

  return null
}

function normalizePendingInvitations(input: unknown): Array<PendingInvitationRow> {
  const now = Date.now()
  const invitations = Array.isArray(input) ? input : []

  return invitations
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null
      }

      const invitation = entry as Record<string, unknown>
      const statusValue = invitation.status
      const status = typeof statusValue === "string" ? statusValue : "pending"
      if (status !== "pending") {
        return null
      }

      const id = invitation.id
      if (typeof id !== "string" || id.trim().length === 0) {
        return null
      }

      const expiresAt = safeDate(invitation.expiresAt)
      if (expiresAt && expiresAt.getTime() <= now) {
        return null
      }

      const createdAt = safeDate(invitation.createdAt) ?? new Date()
      const role =
        typeof invitation.role === "string" && invitation.role.length > 0
          ? invitation.role
          : "member"
      const invitedEmail =
        typeof invitation.email === "string" && invitation.email.length > 0
          ? invitation.email
          : ""

      const organizationNameFromFlat = invitation.organizationName
      const organizationNameFromObject =
        invitation.organization &&
        typeof invitation.organization === "object" &&
        "name" in invitation.organization &&
        typeof invitation.organization.name === "string"
          ? invitation.organization.name
          : null
      const organizationName =
        typeof organizationNameFromFlat === "string" &&
        organizationNameFromFlat.length > 0
          ? organizationNameFromFlat
          : organizationNameFromObject || "Unknown group"

      return {
        id,
        organizationName,
        invitedEmail,
        role,
        createdAt,
        expiresAt,
      }
    })
    .filter((entry): entry is PendingInvitationRow => entry !== null)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}

function formatDateLabel(value: Date) {
  return value.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function AccountPage() {
  const data = Route.useLoaderData()
  const navigate = useNavigate()
  const router = useRouter()
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [invitations, setInvitations] = useState<Array<PendingInvitationRow>>([])
  const [isLoadingInvitations, setIsLoadingInvitations] = useState(true)
  const [isRefreshingInvitations, setIsRefreshingInvitations] = useState(false)
  const [resolvingInvitationId, setResolvingInvitationId] = useState("")

  const loadInvitations = async (options?: { showErrorToast?: boolean }) => {
    const showErrorToast = options?.showErrorToast ?? true
    try {
      const { data: invitationData, error } =
        await authClient.organization.listUserInvitations()

      if (error) {
        if (showErrorToast) {
          toast.error("Could not load invitations", {
            description: getAuthErrorMessage(error),
          })
        }
        return
      }

      setInvitations(normalizePendingInvitations(invitationData))
    } catch (error) {
      if (showErrorToast) {
        toast.error("Could not load invitations", {
          description: getAuthErrorMessage(error),
        })
      }
    } finally {
      setIsLoadingInvitations(false)
      setIsRefreshingInvitations(false)
    }
  }

  useEffect(() => {
    let isActive = true

    const run = async () => {
      if (!isActive) {
        return
      }

      await loadInvitations()
    }

    void run()

    return () => {
      isActive = false
    }
  }, [])

  const onResolveInvitation = async (
    entry: PendingInvitationRow,
    action: "accept" | "reject"
  ) => {
    setResolvingInvitationId(entry.id)
    setIsRefreshingInvitations(true)
    try {
      const result =
        action === "accept"
          ? await authClient.organization.acceptInvitation({
              invitationId: entry.id,
            })
          : await authClient.organization.rejectInvitation({
              invitationId: entry.id,
            })

      if (result.error) {
        toast.error(
          action === "accept"
            ? "Could not accept invitation"
            : "Could not reject invitation",
          {
            description: getAuthErrorMessage(result.error),
          }
        )
        await loadInvitations({ showErrorToast: false })
        return
      }

      toast.success(
        action === "accept"
          ? `Joined ${entry.organizationName}`
          : `Rejected invite to ${entry.organizationName}`
      )

      await Promise.all([
        loadInvitations({ showErrorToast: false }),
        router.invalidate(),
      ])
    } catch (error) {
      toast.error(
        action === "accept"
          ? "Could not accept invitation"
          : "Could not reject invitation",
        {
          description: getAuthErrorMessage(error),
        }
      )
      await loadInvitations({ showErrorToast: false })
    } finally {
      setResolvingInvitationId("")
      setIsRefreshingInvitations(false)
    }
  }

  const handleLogout = async () => {
    setIsSigningOut(true)
    try {
      const { error } = await authClient.signOut()
      if (error) {
        toast.error("Could not sign you out", {
          description: getAuthErrorMessage(error),
        })
        return
      }

      await navigate({ to: "/login" })
    } catch (error) {
      toast.error("Could not sign you out", {
        description: getAuthErrorMessage(error),
      })
    } finally {
      setIsSigningOut(false)
    }
  }

  return (
    <DashboardShell title="Account">
      <div className="mx-auto w-full max-w-3xl space-y-4">
        <section className="dashboard-surface">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-lg font-medium text-foreground">
                {data.user.name}
              </p>
              <p className="truncate text-sm text-muted-foreground">
                {data.user.email}
              </p>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span>
                  {data.stats.groupCount} group
                  {data.stats.groupCount === 1 ? "" : "s"}
                </span>
                <span>
                  {data.stats.friendCount} friend ledger
                  {data.stats.friendCount === 1 ? "" : "s"}
                </span>
              </div>
            </div>
            <Button
              type="button"
              variant="destructive"
              className="h-10 rounded-xl"
              onClick={handleLogout}
              disabled={isSigningOut}
            >
              {isSigningOut ? "Signing out..." : "Log out"}
            </Button>
          </div>
        </section>

        <section id="group-invitations" className="dashboard-surface">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="font-heading text-xl">Invitations</h2>
            <span className="text-xs text-muted-foreground">
              {invitations.length} pending
            </span>
          </div>

          {isLoadingInvitations ? (
            <p className="text-sm text-muted-foreground">Loading invitations...</p>
          ) : invitations.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No pending invitations.
            </p>
          ) : (
            <div className="divide-y divide-border/70">
              {invitations.map((entry) => {
                const isResolving = resolvingInvitationId === entry.id
                return (
                  <div
                    key={entry.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {entry.organizationName}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {entry.role} · invited {formatDateLabel(entry.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 rounded-lg"
                        disabled={isResolving || isRefreshingInvitations}
                        onClick={() => void onResolveInvitation(entry, "reject")}
                      >
                        {isResolving ? "Working..." : "Reject"}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        className="h-8 rounded-lg"
                        disabled={isResolving || isRefreshingInvitations}
                        onClick={() => void onResolveInvitation(entry, "accept")}
                      >
                        {isResolving ? "Working..." : "Accept"}
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </DashboardShell>
  )
}
