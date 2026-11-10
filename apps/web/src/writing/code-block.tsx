"use client";

import {
  type ComponentProps,
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

function CopyButton({ code }: { code: RefObject<HTMLPreElement | null> }) {
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
      if (!code.current) {
        throw new Error("No code block beside the button");
      }
      await navigator.clipboard.writeText(
        (code.current.textContent ?? "").replace(/\n$/, ""),
      );
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

export function CodeBlock({ style, ...props }: ComponentProps<"pre">) {
  const hydrated = useHydrated();
  const [wrapped, setWrapped] = useState(false);
  const code = useRef<HTMLPreElement>(null);

  return (
    <div
      className="code-block"
      style={style}
      data-wrapped={wrapped ? "" : undefined}
    >
      <pre ref={code} style={style} {...props} />
      {hydrated ? (
        <div className="code-actions">
          <button
            type="button"
            aria-pressed={wrapped}
            onClick={() => setWrapped(!wrapped)}
            className="wrap-button"
          >
            Wrap
          </button>
          <CopyButton code={code} />
        </div>
      ) : null}
    </div>
  );
}
