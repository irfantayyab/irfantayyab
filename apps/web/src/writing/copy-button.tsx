"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

function subscribe() {
  return () => {};
}

export function CopyButton() {
  const hydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const [copied, setCopied] = useState(false);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!copied) {
      return;
    }
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  if (!hydrated) {
    return null;
  }

  async function copy() {
    const code = button.current?.closest(".code-block")?.querySelector("pre");
    if (!code) {
      return;
    }
    await navigator.clipboard.writeText(
      (code.textContent ?? "").replace(/\n$/, ""),
    );
    setCopied(true);
  }

  return (
    <>
      <button ref={button} type="button" onClick={copy} className="copy-button">
        {copied ? "Copied" : "Copy"}
      </button>
      <span role="status" className="sr-only">
        {copied ? "Copied" : ""}
      </span>
    </>
  );
}
