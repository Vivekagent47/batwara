import { createFileRoute } from "@tanstack/react-router"

import { createAbsoluteUrl } from "@/lib/site-config"

export const Route = createFileRoute("/sitemap.xml" as never)({
  server: {
    handlers: {
      GET: () => {
        const pages = [createAbsoluteUrl("/")]
        const lastModified = new Date().toISOString()
        const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages
  .map(
    (url) => `  <url>
    <loc>${url}</loc>
    <lastmod>${lastModified}</lastmod>
  </url>`
  )
  .join("\n")}
</urlset>`

        return new Response(body, {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        })
      },
    },
  },
})
