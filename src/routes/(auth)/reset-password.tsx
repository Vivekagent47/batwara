import { Link, createFileRoute } from "@tanstack/react-router"

import {
  AuthForm,
  AuthFormMeta,
  AuthShell,
  AuthStatusMessage,
  AuthSubmitButton,
  PasswordField,
  createAuthPageHead,
  useDemoSubmit,
} from "@/components/auth/auth-shell"

const pageDescription = "Set a new password for your Batwara account."

type ResetSearch = {
  state?: "expired"
}

export const Route = createFileRoute("/(auth)/reset-password")({
  validateSearch: (search: Record<string, unknown>): ResetSearch => ({
    state: search.state === "expired" ? "expired" : undefined,
  }),
  head: () => createAuthPageHead("Reset Password", pageDescription),
  component: ResetPasswordPage,
})

function ResetPasswordPage() {
  const search = Route.useSearch()
  const { isPending, status, runDemoSubmit, clearStatus } = useDemoSubmit({
    outcome: "success",
    successTitle: "Password reset state ready",
    successBody:
      "This screen is prepared for Better Auth token verification and password updates once the backend is connected.",
  })

  const isExpired = search.state === "expired"

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
            body="When Better Auth is connected, expired or already-used links will land on this recovery state instead of a blank failure."
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
          {status ? <AuthStatusMessage {...status} /> : null}

          <form
            className="space-y-5"
            onSubmit={runDemoSubmit}
            onChange={clearStatus}
          >
            <PasswordField
              label="New password"
              name="password"
              placeholder="Create a new password"
              autoComplete="new-password"
            />
            <PasswordField
              label="Confirm new password"
              name="confirmPassword"
              placeholder="Repeat the new password"
              autoComplete="new-password"
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
