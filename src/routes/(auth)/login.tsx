import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { Loading03Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { toast } from "sonner"
import { useMemo, useState } from "react"
import type { FormEvent } from "react"

import {
  AuthField,
  AuthForm,
  AuthFormMeta,
  AuthShell,
  AuthSubmitButton,
  PasswordField,
  createAuthPageHead,
} from "@/components/auth/auth-shell"
import { Button } from "@/components/ui/button"
import { authClient, getAuthErrorMessage } from "@/lib/auth-client"

const pageDescription =
  "Sign in to Batwara to manage shared expenses, balances, and future group activity."

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

export const Route = createFileRoute("/(auth)/login")({
  head: () => createAuthPageHead("Log In", pageDescription),
  component: LoginPage,
})

function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isPending, setIsPending] = useState(false)
  const [isResending, setIsResending] = useState(false)

  const verificationCallbackUrl = useMemo(
    () =>
      typeof window === "undefined"
        ? "/verify-email?status=verified"
        : `${window.location.origin}/verify-email?status=verified`,
    []
  )

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsPending(true)

    const { data, error } = await authClient.signIn.email({
      email,
      password,
      callbackURL: "/dashboard",
    })

    setIsPending(false)

    if (error) {
      toast.error("Could not sign you in", {
        description: getAuthErrorMessage(error),
      })
      return
    }

    if (data.url) {
      window.location.href = data.url
      return
    }

    await navigate({ to: "/dashboard" })
  }

  const resendVerification = async () => {
    if (!email) {
      toast.error("Add your email first", {
        description:
          "Enter the email tied to your Batwara account before resending verification.",
      })
      return
    }

    if (!isValidEmail(email)) {
      toast.error("Email is not valid", {
        description: "Use a valid email address before resending verification.",
      })
      return
    }

    setIsResending(true)

    const { error } = await authClient.sendVerificationEmail({
      email,
      callbackURL: verificationCallbackUrl,
    })

    setIsResending(false)

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
      eyebrow="Sign in"
      title="Split expenses. Keep the group calm."
      description="Use your Batwara account to return to shared balances, group activity, and the next expense that needs context."
      asideTitle="A quiet login flow for shared money."
      asideBody="Batwara is built for the moments when groups need clarity fast. The sign-in experience stays calm so people can get back to the trip, the home, or the plan they are already in."
      asidePoints={[
        "Return to shared balances without spreadsheet hunting.",
        "Pick up where your last group expense left off.",
        "Stay focused on settling up, not navigating clutter.",
      ]}
      footer={
        <AuthFormMeta
          prompt="Don't have an account?"
          actionLabel="Create one"
          to="/register"
        />
      }
    >
      <AuthForm>
        <form className="space-y-5" onSubmit={handleSubmit}>
          <AuthField
            label="Email"
            name="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <PasswordField
            label="Password"
            name="password"
            placeholder="Enter your password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />

          <div className="flex items-center justify-end">
            <AuthFormMeta
              prompt=""
              actionLabel="Forgot password?"
              to="/forgot-password"
            />
          </div>

          <AuthSubmitButton pending={isPending}>Sign in</AuthSubmitButton>

          <Button
            type="button"
            variant="outline"
            disabled={isResending}
            onClick={resendVerification}
            className="h-12 w-full rounded-[1rem] border-border bg-white/80 text-base text-foreground hover:bg-white"
          >
            {isResending ? (
              <>
                <HugeiconsIcon
                  icon={Loading03Icon}
                  className="size-4 animate-spin"
                  strokeWidth={1.5}
                />
                Sending verification email...
              </>
            ) : (
              "Resend verification email"
            )}
          </Button>
        </form>
      </AuthForm>
    </AuthShell>
  )
}
