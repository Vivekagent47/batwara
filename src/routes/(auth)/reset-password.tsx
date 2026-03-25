import { Link, createFileRoute, useNavigate } from "@tanstack/react-router"
import { toast } from "sonner"
import { useState } from "react"
import type { FormEvent } from "react"

import {
  AuthForm,
  AuthFormMeta,
  AuthShell,
  AuthStatusMessage,
  AuthSubmitButton,
  PasswordField,
  createAuthPageHead,
} from "@/components/auth/auth-shell"
import { authClient, getAuthErrorMessage } from "@/lib/auth-client"

const pageDescription = "Set a new password for your Batwara account."

type ResetSearch = {
  state?: "expired"
  token?: string
  error?: string
}

export const Route = createFileRoute("/(auth)/reset-password")({
  validateSearch: (search: Record<string, unknown>): ResetSearch => ({
    state: search.state === "expired" ? "expired" : undefined,
    token: typeof search.token === "string" ? search.token : undefined,
    error: typeof search.error === "string" ? search.error : undefined,
  }),
  head: () => createAuthPageHead("Reset Password", pageDescription),
  component: ResetPasswordPage,
})

function ResetPasswordPage() {
  const navigate = useNavigate()
  const search = Route.useSearch()
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isPending, setIsPending] = useState(false)

  const isExpired = search.state === "expired" || !search.token

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!search.token) {
      toast.error("Reset token missing", {
        description:
          "Request a new password reset email and open the link from that message.",
      })
      return
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match", {
        description:
          "Use the same password in both fields before saving the new password.",
      })
      return
    }

    setIsPending(true)

    const { error } = await authClient.resetPassword({
      newPassword: password,
      token: search.token,
    })

    setIsPending(false)

    if (error) {
      toast.error("Could not reset password", {
        description: getAuthErrorMessage(error),
      })
      return
    }

    toast.success("Password updated", {
      description: "Your Batwara password has been changed. You can sign in now.",
    })
    await navigate({ to: "/login" })
  }

  return (
    <AuthShell
      eyebrow="Reset password"
      title="Choose a new password and get back to the group."
      description="Choose a new password and move back into the shared expenses, balances, and group context you were trying to reach."
      asideTitle="Getting back in should feel steady."
      asideBody="Even recovery screens should feel like part of the product, not a technical detour. The experience should stay clear whether the link works immediately or needs to be requested again."
      asidePoints={[
        "Set a new password without losing your sense of place.",
        "Keep the language simple when something goes wrong.",
        "Make the next step obvious so people can continue quickly.",
      ]}
      footer={
        <AuthFormMeta
          prompt="Need a new link instead?"
          actionLabel="Request another reset email"
          to="/forgot-password"
        />
      }
    >
      {isExpired ? (
        <div className="space-y-5">
          <AuthStatusMessage
            tone="error"
            title="This reset link is no longer valid"
            body="Request a fresh reset link and use the newest email. Batwara sends password reset links with a limited lifetime."
          />

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              to="/forgot-password"
              className="inline-flex h-12 items-center justify-center rounded-[1rem] bg-primary px-5 text-base font-medium text-primary-foreground transition-colors hover:bg-primary/92"
            >
              Request a new link
            </Link>
            <Link
              to="/login"
              className="inline-flex h-12 items-center justify-center rounded-[1rem] border border-border bg-white/80 px-5 text-base text-foreground transition-colors hover:bg-white"
            >
              Back to login
            </Link>
          </div>
        </div>
      ) : (
        <AuthForm>
          <form className="space-y-5" onSubmit={handleSubmit}>
            <PasswordField
              label="New password"
              name="password"
              placeholder="Create a new password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <PasswordField
              label="Confirm new password"
              name="confirmPassword"
              placeholder="Repeat the new password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />

            <AuthSubmitButton pending={isPending}>
              Reset password
            </AuthSubmitButton>
          </form>
        </AuthForm>
      )}
    </AuthShell>
  )
}
