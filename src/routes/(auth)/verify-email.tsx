import { Link, createFileRoute } from "@tanstack/react-router"
import { Loading03Icon, MailValidation01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useState } from "react"
import { toast } from "sonner"

import {
  AuthFormMeta,
  AuthShell,
  AuthStatusMessage,
  createAuthPageHead,
} from "@/components/auth/auth-shell"
import { Button } from "@/components/ui/button"
import { authClient, getAuthErrorMessage } from "@/lib/auth-client"

const pageDescription =
  "Verify your Batwara email so you can start using shared groups and expense tracking."

type VerifyEmailSearch = {
  email?: string
  status?: "verified"
  error?: string
}

export const Route = createFileRoute("/(auth)/verify-email")({
  validateSearch: (search: Record<string, unknown>): VerifyEmailSearch => ({
    email: typeof search.email === "string" ? search.email : undefined,
    status: search.status === "verified" ? "verified" : undefined,
    error: typeof search.error === "string" ? search.error : undefined,
  }),
  head: () => createAuthPageHead("Verify Email", pageDescription),
  component: VerifyEmailPage,
})

function VerifyEmailPage() {
  const search = Route.useSearch()
  const [isPending, setIsPending] = useState(false)
  const status:
    | {
        tone: "success" | "error" | "neutral"
        title: string
        body: string
      }
    | null =
    search.status === "verified"
      ? {
          tone: "success",
          title: "Email verified",
          body: "Your Batwara account is ready. You can sign in now.",
        }
      : search.error
        ? {
            tone: "error",
            title: "That verification link is no longer valid",
            body: "Request a fresh verification email and open the newest link instead.",
          }
        : null

  const resendVerification = async () => {
    if (!search.email) {
      toast.error("Email address missing", {
        description:
          "Return to sign up or log in and request a fresh verification email.",
      })
      return
    }

    setIsPending(true)

    const { error } = await authClient.sendVerificationEmail({
      email: search.email,
      callbackURL: `${window.location.origin}/verify-email?status=verified`,
    })

    setIsPending(false)

    if (error) {
      const message = getAuthErrorMessage(error)
      toast.error("Could not send verification email", {
        description: message,
      })
      return
    }

    toast.success("Verification email sent", {
      description:
        "If that account exists, Batwara has logged the email details in the terminal in development.",
    })
  }

  return (
    <AuthShell
      eyebrow="Verify email"
      title="Confirm the email, then step into the group."
      description="Batwara keeps the account flow deliberate. Verify the email once, then come back to shared balances, expenses, and group context."
      asideTitle="Verification keeps the ledger trustworthy."
      asideBody="Shared money gets messy fast when account ownership is unclear. Batwara uses email verification to make sure the person joining a group is the one holding the inbox."
      asidePoints={[
        "One verified email for every Batwara account.",
        "A clear recovery path when links expire or get buried.",
        "Simple sign-in once the verification step is complete.",
      ]}
      footer={
        <AuthFormMeta
          prompt="Already verified?"
          actionLabel="Back to login"
          to="/login"
        />
      }
    >
      <div className="space-y-5">
        {status ? <AuthStatusMessage {...status} /> : null}

        {!status ? (
          <div className="rounded-[1.4rem] border border-border/80 bg-white/80 px-5 py-5">
            <div className="flex items-start gap-3">
              <HugeiconsIcon
                icon={MailValidation01Icon}
                className="mt-0.5 size-5 text-primary"
                strokeWidth={1.5}
              />
              <div>
                <p className="text-sm font-medium text-foreground">
                  Check your inbox
                </p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {search.email
                    ? `We sent a verification link to ${search.email}. Open that email and come back once it is confirmed.`
                    : "We sent a verification email to the address tied to your account. Open the newest email to continue."}
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {search.status === "verified" ? (
          <Link
            to="/login"
            className="inline-flex h-12 w-full items-center justify-center rounded-[1rem] bg-primary px-5 text-base font-medium text-primary-foreground transition-colors hover:bg-primary/92"
          >
            Continue to login
          </Link>
        ) : (
          <Button
            type="button"
            size="lg"
            disabled={isPending}
            onClick={resendVerification}
            className="h-12 w-full rounded-[1rem] bg-primary text-base font-medium text-primary-foreground hover:bg-primary/92"
          >
            {isPending ? (
              <>
                <HugeiconsIcon
                  icon={Loading03Icon}
                  className="size-4 animate-spin"
                  strokeWidth={1.5}
                />
                Sending...
              </>
            ) : (
              "Send another verification email"
            )}
          </Button>
        )}
      </div>
    </AuthShell>
  )
}
