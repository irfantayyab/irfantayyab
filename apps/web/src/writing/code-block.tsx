"use client";

import {
  type ReactNode,
  type RefObject,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

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

function useHydrated() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}

function shownCode(block: HTMLElement) {
  return [...block.querySelectorAll(".ec-line .code")]
    .map((line) => line.textContent ?? "")
    .join("\n");
}

function CopyButton({ block }: { block: RefObject<HTMLDivElement | null> }) {
  const [shown, setShown] = useState<{ result: Result }>({ result: "idle" });
  const [message, setMessage] = useState("");

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

  async function copy() {
    setMessage("");
    let result: Result = "copied";
    try {
      if (!block.current) {
        throw new Error("No code block beside the button");
      }
      await navigator.clipboard.writeText(shownCode(block.current));
    } catch {
      result = "failed";
    }
    setShown({ result });
    setMessage(labels[result]);
  }

  return (
    <>
      <button type="button" onClick={copy} className="copy-button">
        {labels[shown.result]}
      </button>
      <span role="status" className="sr-only">
        {message}
      </span>
    </>
  );
}

export function CodeBlock({ children }: { children?: ReactNode }) {
  const hydrated = useHydrated();
  const [wrapped, setWrapped] = useState(false);
  const block = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={block}
      className="code-block"
      data-wrapped={wrapped ? "" : undefined}
    >
      <div className="code-actions">
        {hydrated ? (
          <>
            <button
              type="button"
              aria-pressed={wrapped}
              onClick={() => setWrapped(!wrapped)}
              className="wrap-button"
            >
              Wrap
            </button>
            <CopyButton block={block} />
          </>
        ) : null}
      </div>
      {children}
    </div>
  );
}
