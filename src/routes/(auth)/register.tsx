import { createFileRoute } from "@tanstack/react-router"

import {
  AuthField,
  AuthForm,
  AuthFormMeta,
  AuthShell,
  AuthStatusMessage,
  AuthSubmitButton,
  PasswordField,
  createAuthPageHead,
  useDemoSubmit,
} from "@/components/auth/auth-shell"

const pageDescription =
  "Create a Batwara account to start tracking shared expenses and group balances."

export const Route = createFileRoute("/(auth)/register")({
  head: () => createAuthPageHead("Create Account", pageDescription),
  component: RegisterPage,
})

function RegisterPage() {
  const { isPending, status, runDemoSubmit, clearStatus } = useDemoSubmit({
    outcome: "success",
    successTitle: "Account flow staged",
    successBody:
      "The sign-up experience is ready for Better Auth. Verification and account creation will be connected in the backend phase.",
  })

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
        {status ? <AuthStatusMessage {...status} /> : null}

        <form
          className="space-y-5"
          onSubmit={runDemoSubmit}
          onChange={clearStatus}
        >
          <AuthField
            label="Full name"
            name="name"
            type="text"
            placeholder="Aarya Mehta"
            autoComplete="name"
          />
          <AuthField
            label="Email"
            name="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
          />
          <PasswordField
            label="Password"
            name="password"
            placeholder="Create a password"
            autoComplete="new-password"
            hint="Use at least one phrase you can remember without making it obvious."
          />
          <PasswordField
            label="Confirm password"
            name="confirmPassword"
            placeholder="Repeat your password"
            autoComplete="new-password"
          />

          <AuthSubmitButton pending={isPending}>
            Create account
          </AuthSubmitButton>
        </form>
      </AuthForm>
    </AuthShell>
  )
}
