import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { resume } from "@/resume/claims";
import { siteUrl } from "@/site";
import { newsreader } from "./fonts";
import "./globals.css";
import { feedLinks, siteDescription } from "./page-metadata";
import { pageColors } from "./theme";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: resume.name,
    template: `%s · ${resume.name}`,
  },
  description: siteDescription,
  alternates: { types: feedLinks },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: pageColors.light },
    { media: "(prefers-color-scheme: dark)", color: pageColors.dark },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className={newsreader.variable}>
      <body className="bg-page font-serif text-lg/[1.7] text-ink antialiased">
        {children}
      </body>
    </html>
  );
}
