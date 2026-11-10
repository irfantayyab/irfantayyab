"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { label: "Home", href: "/", current: (path: string) => path === "/" },
  {
    label: "Writing",
    href: "/writing",
    current: (path: string) =>
      path === "/writing" || path.startsWith("/writing/"),
  },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Site">
      <ul className="flex gap-x-5 font-sans text-base">
        {items.map(({ label, href, current }) => (
          <li key={href}>
            <Link
              href={href}
              aria-current={current(pathname) ? "page" : undefined}
              className="aria-[current=page]:text-ink"
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
