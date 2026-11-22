"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

const rowAttribute = "data-scroll-row";
const edgeWidth = 40;

export function revealInRow(element: HTMLElement) {
  const row = element.closest<HTMLElement>(`[${rowAttribute}]`);
  if (!row) {
    return;
  }
  const bounds = row.getBoundingClientRect();
  const { left, right } = element.getBoundingClientRect();
  if (left < bounds.left + edgeWidth) {
    row.scrollBy({ left: left - bounds.left - edgeWidth });
  } else if (right > bounds.right - edgeWidth) {
    row.scrollBy({ left: right - bounds.right + edgeWidth });
  }
}

type Side = "start" | "end";

function Chevron({ side }: { side: Side }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={side === "start" ? "M10 3 5 8l5 5" : "m6 3 5 5-5 5"} />
    </svg>
  );
}

function Edge({ side, onClick }: { side: Side; onClick: () => void }) {
  return (
    <button
      type="button"
      tabIndex={-1}
      aria-hidden="true"
      data-scroll-edge={side}
      onClick={onClick}
      className={`absolute inset-y-0 flex w-10 cursor-pointer items-center from-page from-50% to-transparent text-muted hover:text-ink ${
        side === "start"
          ? "left-0 justify-start bg-linear-to-r"
          : "right-0 justify-end bg-linear-to-l"
      }`}
    >
      <Chevron side={side} />
    </button>
  );
}

export function ScrollAffordanceContainer({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const row = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: false, end: false });

  useEffect(() => {
    const element = row.current;
    if (!element) {
      return;
    }
    const update = () =>
      setEdges({
        start: element.scrollLeft > 1,
        end: element.scrollLeft + element.clientWidth < element.scrollWidth - 1,
      });
    update();
    element.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(element);
    for (const child of element.children) {
      observer.observe(child);
    }
    return () => {
      element.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, []);

  function step(direction: 1 | -1) {
    const element = row.current;
    element?.scrollBy({
      left: direction * element.clientWidth * 0.6,
      behavior: "smooth",
    });
  }

  return (
    <div className={`relative ${className}`}>
      <div
        ref={row}
        data-scroll-row=""
        className="scroll-row h-full overflow-x-auto"
      >
        {children}
      </div>
      {edges.start ? <Edge side="start" onClick={() => step(-1)} /> : null}
      {edges.end ? <Edge side="end" onClick={() => step(1)} /> : null}
    </div>
  );
}
