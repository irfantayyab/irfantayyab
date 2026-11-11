import type { ReactNode } from "react";
import { SiteFrame } from "@/app/site-frame";

export default function SiteLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return <SiteFrame>{children}</SiteFrame>;
}
