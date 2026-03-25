import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { toast } from "sonner"
import { useState } from "react"
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
import { authClient, getAuthErrorMessage } from "@/lib/auth-client"

const pageDescription =
  "Create a Batwara account to start tracking shared expenses and group balances."

export const Route = createFileRoute("/(auth)/register")({
  head: () => createAuthPageHead("Create Account", pageDescription),
  component: RegisterPage,
})

function RegisterPage() {
  const navigate = useNavigate()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isPending, setIsPending] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (password !== confirmPassword) {
      toast.error("Passwords do not match", {
        description:
          "Use the same password in both fields before creating the account.",
      })
      return
    }

    setIsPending(true)

    const { error } = await authClient.signUp.email({
      name,
      email,
      password,
      callbackURL: "/verify-email?status=verified",
    })

    setIsPending(false)

    if (error) {
      toast.error("Could not create your account", {
        description: getAuthErrorMessage(error),
      })
      return
    }

    toast.success("Account created", {
      description: "Check your inbox and verify your Batwara email.",
    })
    await navigate({
      to: "/verify-email",
      search: { email },
    })
  }

  return (
    <AuthShell
      eyebrow="Create account"
      title="Start with a clear ledger and a lighter group chat."
      description="Create your Batwara account to join shared groups, track expenses, and keep the math understandable from the start."
      asideTitle="Designed for the moment before the first expense."
      asideBody="Joining Batwara should feel straightforward and calm. The goal is to help people start a shared money flow without adding more friction to the group."
      asidePoints={[
        "Start clean with one account for all your groups.",
        "Track trips, shared homes, couples, and recurring plans in one place.",
        "Get to the product quickly instead of stepping through a funnel.",
      ]}
      footer={
        <AuthFormMeta
          prompt="Already have an account?"
          actionLabel="Log in"
          to="/login"
        />
      }
    >
      <AuthForm>
        <form className="space-y-5" onSubmit={handleSubmit}>
          <AuthField
            label="Full name"
            name="name"
            type="text"
            placeholder="Aarya Mehta"
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
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
            placeholder="Create a password"
            autoComplete="new-password"
            hint="Use at least one phrase you can remember without making it obvious."
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <PasswordField
            label="Confirm password"
            name="confirmPassword"
            placeholder="Repeat your password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />

          <AuthSubmitButton pending={isPending}>
            Create account
          </AuthSubmitButton>
        </form>
      </AuthForm>
    </AuthShell>
  )
}
