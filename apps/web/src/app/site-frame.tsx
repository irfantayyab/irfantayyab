import type { ReactNode } from "react";
import { resume } from "@/resume/claims";
import { Nav } from "./nav";
import { mainId } from "./page-ids";

const analyticsToken = process.env.NEXT_PUBLIC_CF_ANALYTICS_TOKEN;

export function SiteFrame({ children }: { children: ReactNode }) {
  return (
    <>
      <a
        href={`#${mainId}`}
        className="sr-only font-sans text-base focus:not-sr-only focus:absolute focus:top-3 focus:left-4 focus:bg-page focus:px-2 focus:py-1 focus:text-ink"
      >
        Skip to content
      </a>
      <div className="mx-auto box-content max-w-150 px-4">
        <header className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 pt-10 pb-12 sm:pt-16">
          <a
            href={resume.links.github.url}
            rel="me"
            className="font-semibold text-ink no-underline hover:underline"
          >
            @irfantayyab
          </a>
          <Nav />
        </header>
        <main id={mainId} tabIndex={-1} className="pb-24">
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
    </>
  );
}
