import { createFileRoute } from "@tanstack/react-router"

import { createAbsoluteUrl } from "@/lib/site-config"

export const Route = createFileRoute("/robots.txt" as never)({
  server: {
    handlers: {
      GET: () => {
        const body = `User-agent: *
Disallow:

User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

User-agent: GPTBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: anthropic-ai
Allow: /

Sitemap: ${createAbsoluteUrl("/sitemap.xml")}`

        return new Response(body, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        })
      },
    },
  },
})
