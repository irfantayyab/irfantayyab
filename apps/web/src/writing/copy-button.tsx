"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

type Result = "idle" | "copied" | "failed";

const labels: Record<Result, string> = {
  idle: "Copy",
  copied: "Copied",
  failed: "Copy failed",
};

function subscribe() {
  return () => {};
}

export function CopyButton() {
  const hydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const [result, setResult] = useState<Result>("idle");
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (result === "idle") {
      return;
    }
    const timer = setTimeout(() => setResult("idle"), 2000);
    return () => clearTimeout(timer);
  }, [result]);

  if (!hydrated) {
    return null;
  }

  async function copy() {
    const code = button.current?.closest(".code-block")?.querySelector("pre");
    try {
      if (!code) {
        throw new Error("No code block beside the button");
      }
      await navigator.clipboard.writeText(
        (code.textContent ?? "").replace(/\n$/, ""),
      );
      setResult("copied");
    } catch {
      setResult("failed");
    }
  }

  return (
    <>
      <button ref={button} type="button" onClick={copy} className="copy-button">
        {labels[result]}
      </button>
      <span role="status" className="sr-only">
        {result === "idle" ? "" : labels[result]}
      </span>
    </>
  );
}
