import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { SecurityCheckIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useState } from "react"
import { toast } from "sonner"

import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { Button } from "@/components/ui/button"
import { authClient, getAuthErrorMessage } from "@/lib/auth-client"
import { getAccountPageData } from "@/lib/dashboard-server"

export const Route = createFileRoute("/account/")({
  loader: async () => getAccountPageData(),
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

function AccountPage() {
  const data = Route.useLoaderData()
  const navigate = useNavigate()
  const [isSigningOut, setIsSigningOut] = useState(false)

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
    <DashboardShell
      title="Account"
      description="Account visibility, active ledgers, and sign-in profile context."
      headerActions={
        <div className="inline-flex items-center rounded-xl border border-border bg-background/80 px-3 py-2 text-xs text-muted-foreground">
          <HugeiconsIcon
            icon={SecurityCheckIcon}
            className="mr-1.5 size-3.5"
            strokeWidth={1.7}
          />
          Verified auth session
        </div>
      }
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-border/80 bg-background/95 p-4">
          <h2 className="font-heading text-xl">Profile</h2>
          <div className="mt-3 space-y-3">
            <div className="rounded-xl border border-border/70 px-3 py-3">
              <p className="text-xs text-muted-foreground uppercase">Name</p>
              <p className="mt-1 text-sm font-medium">{data.user.name}</p>
            </div>
            <div className="rounded-xl border border-border/70 px-3 py-3">
              <p className="text-xs text-muted-foreground uppercase">Email</p>
              <p className="mt-1 text-sm font-medium">{data.user.email}</p>
            </div>
            <div className="rounded-xl border border-border/70 px-3 py-3">
              <p className="text-xs text-muted-foreground uppercase">User id</p>
              <p className="font-mono-ui mt-1 text-xs break-all">
                {data.user.id}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border/80 bg-background/95 p-4">
          <h2 className="font-heading text-xl">Ledger footprint</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border/70 px-3 py-3">
              <p className="text-xs text-muted-foreground uppercase">Groups</p>
              <p className="mt-1 font-heading text-2xl">
                {data.stats.groupCount}
              </p>
            </div>
            <div className="rounded-xl border border-border/70 px-3 py-3">
              <p className="text-xs text-muted-foreground uppercase">
                Friend ledgers
              </p>
              <p className="mt-1 font-heading text-2xl">
                {data.stats.friendCount}
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Password, verification, and session controls continue to be handled
            by Better Auth flows.
          </p>
          <div className="mt-4">
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
      </div>
    </DashboardShell>
  )
}
