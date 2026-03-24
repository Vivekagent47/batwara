import { Suspense, lazy } from "react"
import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router"

import appCss from "../styles.css?url"
import { InteractiveBackground } from "@/components/interactive-background"
import { appEnv } from "@/lib/env"
import { createAbsoluteUrl, siteConfig } from "@/lib/site-config"
import { NotFoundPage } from "@/components/not-found"

const Devtools =
  appEnv.enableDevtools
    ? lazy(() => import("@/components/devtools").then((mod) => ({ default: mod.Devtools })))
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
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="relative min-h-svh overflow-x-hidden">
        {appEnv.enableInteractiveBackground ? <InteractiveBackground /> : null}
        <div className="relative z-10">{children}</div>
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
