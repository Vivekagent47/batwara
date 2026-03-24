import { Link } from "@tanstack/react-router"
import {
  CheckCircle2,
  CircleAlert,
  Eye,
  EyeOff,
  LoaderCircle,
  ShieldCheck,
} from "lucide-react"
import { useEffect, useId, useRef, useState } from "react"
import type { FormEvent, InputHTMLAttributes, ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

type AuthShellProps = {
  eyebrow: string
  title: string
  description: string
  footer: ReactNode
  children: ReactNode
  asideTitle: string
  asideBody: string
  asidePoints: Array<string>
}

type AuthStatusTone = "success" | "error" | "neutral"

type AuthStatusProps = {
  tone: AuthStatusTone
  title: string
  body: string
}

type AuthFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "size"> & {
  label: string
  hint?: string
  error?: string
  trailing?: ReactNode
}

type DemoSubmitOptions = {
  outcome?: "success" | "error"
  successTitle?: string
  successBody?: string
  errorTitle?: string
  errorBody?: string
  delayMs?: number
}

type DemoSubmitResult = {
  isPending: boolean
  status: AuthStatusProps | null
  runDemoSubmit: (event: FormEvent<HTMLFormElement>) => void
  clearStatus: () => void
}

const authInputShellClasses =
  "group/auth-input relative overflow-hidden rounded-[1rem] border border-[#d8d0c2] bg-white/92 shadow-[0_12px_26px_rgba(28,28,24,0.04)] transition-all before:absolute before:top-3 before:bottom-3 before:left-0 before:w-[3px] before:rounded-full before:bg-transparent before:transition-colors focus-within:border-primary/35 focus-within:shadow-[0_0_0_3px_rgba(26,107,60,0.12)] focus-within:before:bg-primary"

export function createAuthPageHead(title: string, description: string) {
  return {
    meta: [
      {
        title: `${title} | Batwara`,
      },
      {
        name: "description",
        content: description,
      },
      {
        name: "robots",
        content: "noindex,nofollow",
      },
    ],
  }
}

export function AuthShell({
  eyebrow,
  title,
  description,
  footer,
  children,
  asideTitle,
  asideBody,
  asidePoints,
}: AuthShellProps) {
  return (
    <main className="relative isolate min-h-svh overflow-hidden px-5 py-6 sm:px-8 lg:px-10">
      <div className="paper-grid absolute inset-0 opacity-[0.12]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top,rgba(26,107,60,0.09),transparent_58%)]" />
      <div className="pointer-events-none absolute right-[-10rem] bottom-[-12rem] h-[26rem] w-[26rem] rounded-full bg-[radial-gradient(circle,rgba(204,184,150,0.24),transparent_65%)]" />

      <div className="relative z-10 mx-auto flex min-h-[calc(100svh-3rem)] w-full max-w-6xl items-center">
        <div className="grid w-full gap-6 lg:grid-cols-[minmax(0,34rem)_minmax(18rem,24rem)]">
          <section className="glass-panel rounded-[2rem] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(245,239,230,0.96))] p-6 shadow-[0_24px_56px_rgba(28,28,24,0.08)] sm:p-8">
            <Link
              to="/"
              className="inline-flex items-center gap-3 rounded-full border border-border/70 bg-white/85 px-4 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-white"
            >
              <span className="font-heading text-xl text-primary">Batwara</span>
            </Link>

            <div className="mt-10 max-w-xl">
              <p className="text-xs font-medium tracking-[0.18em] text-primary uppercase">
                {eyebrow}
              </p>
              <h1 className="mt-4 font-heading text-4xl leading-tight text-foreground sm:text-5xl">
                {title}
              </h1>
              <p className="mt-4 max-w-lg text-sm leading-7 text-muted-foreground sm:text-[15px]">
                {description}
              </p>
            </div>

            <div className="mt-8">{children}</div>

            <div className="mt-8 border-t border-border/70 pt-6 text-sm text-muted-foreground">
              {footer}
            </div>
          </section>

          <aside className="glass-panel flex flex-col justify-between rounded-[2rem] border border-white/70 bg-[linear-gradient(180deg,rgba(250,247,241,0.88),rgba(243,236,224,0.96))] p-6 shadow-[0_20px_48px_rgba(28,28,24,0.06)]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-white/80 px-3 py-1.5 text-xs font-medium tracking-[0.14em] text-foreground/80 uppercase">
                <ShieldCheck
                  className="size-3.5 text-primary"
                  strokeWidth={1.5}
                />
                Batwara
              </div>
              <h2 className="mt-5 font-heading text-3xl leading-tight text-foreground">
                {asideTitle}
              </h2>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">
                {asideBody}
              </p>

              <div className="mt-7 space-y-3">
                {asidePoints.map((point) => (
                  <div
                    key={point}
                    className="flex items-start gap-3 rounded-[1.2rem] border border-white/80 bg-white/78 px-4 py-3"
                  >
                    <CheckCircle2
                      className="mt-0.5 size-4 shrink-0 text-primary"
                      strokeWidth={1.5}
                    />
                    <p className="text-sm leading-6 text-foreground/85">
                      {point}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 rounded-[1.4rem] border border-border/70 bg-white/78 p-5">
              <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
                Why people use Batwara
              </p>
              <div className="mt-4 space-y-3">
                <div className="rounded-[1rem] bg-[#f7f2e8] px-4 py-3">
                  <p className="font-mono-ui text-sm text-foreground">
                    Who paid
                  </p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Keep a clean record of shared spends without losing context.
                  </p>
                </div>
                <div className="rounded-[1rem] bg-[#f7f2e8] px-4 py-3">
                  <p className="font-mono-ui text-sm text-foreground">
                    Who owes
                  </p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Make balances readable for trips, homes, couples, and
                    groups.
                  </p>
                </div>
                <div className="rounded-[1rem] bg-[#f7f2e8] px-4 py-3">
                  <p className="font-mono-ui text-sm text-foreground">
                    How to settle
                  </p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Reduce the awkwardness and help everyone close the loop
                    faster.
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  )
}

export function AuthForm({ children }: { children: ReactNode }) {
  return <div className="space-y-5">{children}</div>
}

export function AuthField({
  label,
  hint,
  error,
  trailing,
  className,
  id,
  ...props
}: AuthFieldProps) {
  const generatedId = useId()
  const fieldId = id ?? generatedId
  const hintId = hint ? `${fieldId}-hint` : undefined
  const errorId = error ? `${fieldId}-error` : undefined

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-3">
        <Label
          htmlFor={fieldId}
          className="text-[13px] font-medium tracking-[0.02em] text-foreground/85"
        >
          {label}
        </Label>
        {trailing ? (
          <div className="text-xs text-muted-foreground">{trailing}</div>
        ) : null}
      </div>

      <div
        className={cn(
          authInputShellClasses,
          error ? "border-destructive/40 before:bg-destructive" : null
        )}
      >
        <Input
          id={fieldId}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={
            [hintId, errorId].filter(Boolean).join(" ") || undefined
          }
          className={cn(
            "h-14 border-0 bg-transparent px-5 text-[15px] shadow-none placeholder:text-muted-foreground/70 focus-visible:border-transparent focus-visible:ring-0",
            className
          )}
          {...props}
        />
      </div>

      {error ? (
        <p id={errorId} className="text-sm text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-sm text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

export function PasswordField({
  label,
  hint,
  error,
  id,
  ...props
}: Omit<AuthFieldProps, "type" | "trailing">) {
  const [visible, setVisible] = useState(false)
  const generatedId = useId()
  const fieldId = id ?? generatedId
  const hintId = hint ? `${fieldId}-hint` : undefined
  const errorId = error ? `${fieldId}-error` : undefined

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-3">
        <Label
          htmlFor={fieldId}
          className="text-[13px] font-medium tracking-[0.02em] text-foreground/85"
        >
          {label}
        </Label>
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          {visible ? (
            <EyeOff className="size-3.5" strokeWidth={1.5} />
          ) : (
            <Eye className="size-3.5" strokeWidth={1.5} />
          )}
          {visible ? "Hide" : "Show"}
        </button>
      </div>

      <div
        className={cn(
          authInputShellClasses,
          error ? "border-destructive/40 before:bg-destructive" : null
        )}
      >
        <Input
          id={fieldId}
          type={visible ? "text" : "password"}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={
            [hintId, errorId].filter(Boolean).join(" ") || undefined
          }
          className="h-14 border-0 bg-transparent px-5 text-[15px] shadow-none placeholder:text-muted-foreground/70 focus-visible:border-transparent focus-visible:ring-0"
          {...props}
        />
      </div>

      {error ? (
        <p id={errorId} className="text-sm text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-sm text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

export function AuthStatusMessage({ tone, title, body }: AuthStatusProps) {
  const toneClasses =
    tone === "success"
      ? "border-primary/20 bg-primary/8 text-foreground"
      : tone === "error"
        ? "border-destructive/25 bg-destructive/8 text-foreground"
        : "border-border/80 bg-white/75 text-foreground"

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-[1.1rem] border px-4 py-3",
        toneClasses
      )}
      role="status"
      aria-live="polite"
    >
      {tone === "success" ? (
        <CheckCircle2
          className="mt-0.5 size-4 shrink-0 text-primary"
          strokeWidth={1.5}
        />
      ) : tone === "error" ? (
        <CircleAlert
          className="mt-0.5 size-4 shrink-0 text-destructive"
          strokeWidth={1.5}
        />
      ) : (
        <ShieldCheck
          className="mt-0.5 size-4 shrink-0 text-primary"
          strokeWidth={1.5}
        />
      )}
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{body}</p>
      </div>
    </div>
  )
}

export function AuthSubmitButton({
  children,
  pending,
}: {
  children: ReactNode
  pending?: boolean
}) {
  return (
    <Button
      type="submit"
      size="lg"
      disabled={pending}
      className="h-12 w-full rounded-[1rem] bg-primary text-base font-medium text-primary-foreground hover:bg-primary/92"
    >
      {pending ? (
        <>
          <LoaderCircle className="size-4 animate-spin" strokeWidth={1.5} />
          Working...
        </>
      ) : (
        children
      )}
    </Button>
  )
}

export function AuthFormMeta({
  prompt,
  actionLabel,
  to,
}: {
  prompt: string
  actionLabel: string
  to: string
}) {
  return (
    <p className="text-sm leading-6 text-muted-foreground">
      {prompt ? `${prompt} ` : null}
      <a
        href={to}
        className="font-medium text-primary underline-offset-4 hover:underline"
      >
        {actionLabel}
      </a>
    </p>
  )
}

export function useDemoSubmit({
  outcome = "success",
  successTitle = "Preview complete",
  successBody = "This UI state is ready. The backend wiring comes next.",
  errorTitle = "Backend not connected yet",
  errorBody = "This auth form is still frontend-only. Better Auth will power it in the next phase.",
  delayMs = 900,
}: DemoSubmitOptions = {}): DemoSubmitResult {
  const [isPending, setIsPending] = useState(false)
  const [status, setStatus] = useState<AuthStatusProps | null>(null)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current)
      }
    }
  }, [])

  const clearStatus = () => {
    setStatus(null)
  }

  const runDemoSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
    }

    setIsPending(true)
    setStatus(null)

    timerRef.current = window.setTimeout(() => {
      setIsPending(false)
      setStatus(
        outcome === "success"
          ? {
              tone: "success",
              title: successTitle,
              body: successBody,
            }
          : {
              tone: "error",
              title: errorTitle,
              body: errorBody,
            }
      )
    }, delayMs)
  }

  return { isPending, status, runDemoSubmit, clearStatus }
}
