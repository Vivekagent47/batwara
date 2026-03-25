import { createFileRoute } from "@tanstack/react-router"
import { toast } from "sonner"
import { useState } from "react"
import type { FormEvent } from "react"

import {
  AuthField,
  AuthForm,
  AuthFormMeta,
  AuthShell,
  AuthSubmitButton,
  createAuthPageHead,
} from "@/components/auth/auth-shell"
import { authClient, getAuthErrorMessage } from "@/lib/auth-client"

const pageDescription =
  "Request a password reset link for your Batwara account."

export const Route = createFileRoute("/(auth)/forgot-password")({
  head: () => createAuthPageHead("Forgot Password", pageDescription),
  component: ForgotPasswordPage,
})

function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [isPending, setIsPending] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsPending(true)

    const { error } = await authClient.requestPasswordReset({
      email,
      redirectTo: "/reset-password",
    })

    setIsPending(false)

    if (error) {
      toast.error("Could not send reset link", {
        description: getAuthErrorMessage(error),
      })
      return
    }

    toast.success("Reset link sent", {
      description: `If ${email} belongs to a Batwara account, a reset link is on the way.`,
    })
  }

  return (
    <AuthShell
      eyebrow="Password recovery"
      title="Reset the password, not the whole day."
      description="Enter the email tied to your Batwara account and we’ll guide you back into your groups with as little friction as possible."
      asideTitle="Recovery should stay plain and reassuring."
      asideBody="Password recovery should feel simple and predictable. When someone is already locked out, the page should reduce stress instead of adding more questions."
      asidePoints={[
        "One clear step to restart access.",
        "A calm confirmation instead of a confusing dead end.",
        "Fast path back to group balances and pending expenses.",
      ]}
      footer={
        <AuthFormMeta
          prompt="Remembered it?"
          actionLabel="Back to login"
          to="/login"
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
            hint="Use the same email you plan to use for sign-in."
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />

          <AuthSubmitButton pending={isPending}>
            Send reset link
          </AuthSubmitButton>
        </form>
      </AuthForm>
    </AuthShell>
  )
}
