"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import {
  revealInRow,
  ScrollAffordanceContainer,
} from "@/app/scroll-affordance-container";

type Tab = {
  id: string;
  label: string;
};

function hashTarget() {
  try {
    return decodeURIComponent(window.location.hash.slice(1));
  } catch {
    return "";
  }
}

export function ProjectTabBar({
  tabs,
  defaultId,
  targets,
}: {
  tabs: readonly Tab[];
  defaultId: string;
  targets: Readonly<Record<string, string>>;
}) {
  const [active, setActive] = useState<string>();
  const start = useRef<HTMLDivElement>(null);
  const links = useRef(new Map<string, HTMLAnchorElement>());

  useEffect(() => {
    const sync = () => setActive(targets[hashTarget()] ?? defaultId);
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, [targets, defaultId]);

  useEffect(() => {
    const link = active ? links.current.get(active) : undefined;
    if (link) {
      revealInRow(link);
    }
  }, [active]);

  function select(event: MouseEvent<HTMLAnchorElement>, id: string) {
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      !start.current
    ) {
      return;
    }
    event.preventDefault();
    const stickingPoint =
      start.current.getBoundingClientRect().top + window.scrollY;
    const scrolled = window.scrollY;
    window.location.replace(`#${id}`);
    window.scrollTo({
      top: scrolled > stickingPoint ? stickingPoint : scrolled,
      behavior: "instant",
    });
    setActive(id);
  }

  return (
    <>
      <div ref={start} className="mt-6" />
      <nav
        aria-label="Project groups"
        className="project-tab-bar sticky top-0 z-10 border-b border-underline bg-page"
      >
        <ScrollAffordanceContainer className="h-full">
          <ul className="flex h-full gap-x-6">
            {tabs.map(({ id, label }) => (
              <li key={id} className="shrink-0">
                <a
                  ref={(link) => {
                    if (link) {
                      links.current.set(id, link);
                    } else {
                      links.current.delete(id);
                    }
                  }}
                  href={`#${id}`}
                  aria-current={active === id ? "true" : undefined}
                  onClick={(event) => select(event, id)}
                  className="project-tab-link"
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </ScrollAffordanceContainer>
      </nav>
    </>
  );
}
