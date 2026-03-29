import { Suspense, lazy } from "react"
import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router"

import appCss from "../styles.css?url"
import { appEnv } from "@/lib/env"
import { createAbsoluteUrl, siteConfig } from "@/lib/site-config"
import { NotFoundPage } from "@/components/not-found"
import { Toaster } from "@/components/ui/sonner"

const Devtools = appEnv.enableDevtools
  ? lazy(() =>
      import("@/components/devtools").then((mod) => ({ default: mod.Devtools }))
    )
  : null

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: siteConfig.title,
      },
      {
        name: "description",
        content: siteConfig.description,
      },
      {
        name: "robots",
        content:
          "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1",
      },
      {
        property: "og:site_name",
        content: siteConfig.name,
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      {
        rel: "manifest",
        href: siteConfig.manifestPath,
      },
      {
        rel: "icon",
        href: createAbsoluteUrl("/favicon.ico"),
      },
    ],
  }),
  notFoundComponent: NotFoundPage,
  errorComponent: RootErrorComponent,
  shellComponent: RootDocument,
})

function getErrorMessage(error: unknown): string {
  const queue: Array<unknown> = [error]

  while (queue.length > 0) {
    const current = queue.shift()

    if (current instanceof Error && current.message) {
      return current.message
    }

    if (!current || typeof current !== "object") {
      continue
    }

    const currentRecord = current as Record<string, unknown>

    if (typeof currentRecord.message === "string" && currentRecord.message) {
      return currentRecord.message
    }

    if ("cause" in currentRecord) {
      queue.push(currentRecord.cause)
    }

    if ("data" in currentRecord) {
      queue.push(currentRecord.data)
    }

    if ("error" in currentRecord) {
      queue.push(currentRecord.error)
    }
  }

  return "Unexpected application error."
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="relative min-h-svh overflow-x-hidden">
        <div className="relative z-10">{children}</div>
        <Toaster position="top-right" richColors closeButton />
        {Devtools ? (
          <Suspense fallback={null}>
            <Devtools />
          </Suspense>
        ) : null}
        <Scripts />
      </body>
    </html>
  )
}

function RootErrorComponent({ error }: { error: unknown }) {
  const message = getErrorMessage(error)

  return (
    <main className="relative min-h-svh px-4 py-10 sm:px-6">
      <div className="mx-auto w-full max-w-xl rounded-2xl border border-border bg-background/95 p-6 shadow-sm">
        <h1 className="font-heading text-3xl leading-tight text-foreground">
          Something went wrong
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {message}
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <a
            href="/"
            className="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Go to home
          </a>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-border bg-background px-4 text-sm font-medium text-foreground hover:bg-muted/50"
          >
            Reload page
          </button>
        </div>
      </div>
    </main>
  )
}
