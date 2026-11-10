import type { Root } from "hast";
import { type Components, toJsxRuntime } from "hast-util-to-jsx-runtime";
import type { ComponentProps } from "react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { CopyButton } from "./copy-button";
import { diagramTag } from "./render";

function Diagram({ light, dark }: { light?: string; dark?: string }) {
  return (
    <div className="diagram">
      <div
        className="diagram-light"
        dangerouslySetInnerHTML={{ __html: light ?? "" }}
      />
      <div
        className="diagram-dark"
        dangerouslySetInnerHTML={{ __html: dark ?? "" }}
      />
    </div>
  );
}

function CodeBlock({ style, ...props }: ComponentProps<"pre">) {
  return (
    <div className="code-block" style={style}>
      <pre style={style} {...props} />
      <CopyButton />
    </div>
  );
}

const components = {
  [diagramTag]: Diagram,
  pre: CodeBlock,
} as Partial<Components>;

export function PostBody({ body }: { body: Root }) {
  return (
    <div className="post-body">
      {toJsxRuntime(body, { Fragment, jsx, jsxs, components })}
    </div>
  );
}
