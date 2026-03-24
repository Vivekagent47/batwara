import { createFileRoute } from "@tanstack/react-router"

import {
  AuthField,
  AuthForm,
  AuthFormMeta,
  AuthShell,
  AuthStatusMessage,
  AuthSubmitButton,
  createAuthPageHead,
  useDemoSubmit,
} from "@/components/auth/auth-shell"

const pageDescription =
  "Request a password reset link for your Batwara account."

export const Route = createFileRoute("/(auth)/forgot-password")({
  head: () => createAuthPageHead("Forgot Password", pageDescription),
  component: ForgotPasswordPage,
})

function ForgotPasswordPage() {
  const { isPending, status, runDemoSubmit, clearStatus } = useDemoSubmit({
    outcome: "success",
    successTitle: "Reset flow previewed",
    successBody:
      "If an account matches that email, Better Auth will eventually send a reset link from this screen.",
  })

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
            hint="Use the same email you plan to use for sign-in."
          />

          <AuthSubmitButton pending={isPending}>
            Send reset link
          </AuthSubmitButton>
        </form>
      </AuthForm>
    </AuthShell>
  )
}
