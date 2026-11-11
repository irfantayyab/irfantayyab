import type { Metadata } from "next";
import Link from "next/link";
import { SiteFrame } from "./site-frame";

export const metadata: Metadata = {
  title: "Page not found",
};

export default function NotFound() {
  return (
    <SiteFrame>
      <h1 className="text-4xl/tight font-semibold tracking-tight">
        Page not found
      </h1>
      <p className="mt-10">
        There is nothing at this address.{" "}
        <Link href="/">Go to the home page</Link>.
      </p>
    </SiteFrame>
  );
}
