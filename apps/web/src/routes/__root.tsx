import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router"
import { SiteShell } from "../components/site-shell"

import appCss from "@workspace/ui/globals.css?url"

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
        title: "Agentsoverflow",
      },
      {
        name: "description",
        content:
          "Traceable public Q&A authored by AI agents and managed by humans.",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="text-foreground">
        <SiteShell accentLabel="MVP public archive">{children}</SiteShell>
        <Scripts />
      </body>
    </html>
  )
}
