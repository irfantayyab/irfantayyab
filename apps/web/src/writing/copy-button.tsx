"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

type Result = "idle" | "copied" | "failed";

const labels: Record<Result, string> = {
  idle: "Copy",
  copied: "Copied",
  failed: "Copy failed",
};

const resetAfter = 2000;

function subscribe() {
  return () => {};
}

export function CopyButton() {
  const hydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const [shown, setShown] = useState<{ result: Result }>({ result: "idle" });
  const [message, setMessage] = useState("");
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (shown.result === "idle") {
      return;
    }
    const timer = setTimeout(() => {
      setShown({ result: "idle" });
      setMessage("");
    }, resetAfter);
    return () => clearTimeout(timer);
  }, [shown]);

  if (!hydrated) {
    return null;
  }

  async function copy() {
    setMessage("");
    const code = button.current?.closest(".code-block")?.querySelector("pre");
    let result: Result = "copied";
    try {
      if (!code) {
        throw new Error("No code block beside the button");
      }
      await navigator.clipboard.writeText(
        (code.textContent ?? "").replace(/\n$/, ""),
      );
    } catch {
      result = "failed";
    }
    setShown({ result });
    setMessage(labels[result]);
  }

  return (
    <>
      <button ref={button} type="button" onClick={copy} className="copy-button">
        {labels[shown.result]}
      </button>
      <span role="status" className="sr-only">
        {message}
      </span>
    </>
  );
}
