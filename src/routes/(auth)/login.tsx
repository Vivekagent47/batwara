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
  "Sign in to Batwara to manage shared expenses, balances, and future group activity."

export const Route = createFileRoute("/(auth)/login")({
  head: () => createAuthPageHead("Log In", pageDescription),
  component: LoginPage,
})

function LoginPage() {
  const { isPending, status, runDemoSubmit, clearStatus } = useDemoSubmit({
    outcome: "error",
    errorTitle: "Login UI is ready",
    errorBody:
      "This screen is designed for Better Auth, but the backend session flow is not wired yet.",
  })

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
        {status ? <AuthStatusMessage {...status} /> : null}

        <form
          className="space-y-5"
          onSubmit={runDemoSubmit}
          onChange={clearStatus}
        >
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
            placeholder="Enter your password"
            autoComplete="current-password"
          />

          <div className="flex items-center justify-end">
            <AuthFormMeta
              prompt=""
              actionLabel="Forgot password?"
              to="/forgot-password"
            />
          </div>

          <AuthSubmitButton pending={isPending}>Sign in</AuthSubmitButton>
        </form>
      </AuthForm>
    </AuthShell>
  )
}
