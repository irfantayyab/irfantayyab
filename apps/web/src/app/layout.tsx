import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { resume } from "@/resume/claims";
import { newsreader } from "./fonts";
import "./globals.css";
import { pageColors } from "./theme";

export const metadata: Metadata = {
  title: {
    default: resume.name,
    template: `%s · ${resume.name}`,
  },
  description: `${resume.name}, ${resume.headline}`,
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: pageColors.light },
    { media: "(prefers-color-scheme: dark)", color: pageColors.dark },
  ],
};

const analyticsToken = process.env.NEXT_PUBLIC_CF_ANALYTICS_TOKEN;

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className={newsreader.variable}>
      <body className="bg-page font-serif text-lg/[1.7] text-ink antialiased">
        <a
          href="#main"
          className="sr-only font-sans text-base focus:not-sr-only focus:absolute focus:top-3 focus:left-4 focus:bg-page focus:px-2 focus:py-1 focus:text-ink"
        >
          Skip to content
        </a>
        <div className="mx-auto box-content max-w-150 px-4">
          <header className="pt-10 pb-12 sm:pt-16">
            <a
              href="https://github.com/irfantayyab"
              rel="me"
              className="font-semibold text-ink no-underline hover:underline"
            >
              @irfantayyab
            </a>
          </header>
          <main id="main" tabIndex={-1} className="pb-24">
            {children}
          </main>
        </div>
        {analyticsToken ? (
          <script
            defer
            src="https://static.cloudflareinsights.com/beacon.min.js"
            data-cf-beacon={JSON.stringify({ token: analyticsToken })}
          />
        ) : null}
      </body>
    </html>
  );
}
