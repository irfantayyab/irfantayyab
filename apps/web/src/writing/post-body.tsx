import type { Root } from "hast";
import { type Components, toJsxRuntime } from "hast-util-to-jsx-runtime";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { CodeBlock } from "./code-block";
import { codeTag, diagramTag } from "./render";

function Diagram({
  light,
  dark,
  id,
}: {
  light?: string;
  dark?: string;
  id?: string;
}) {
  return (
    <div className="diagram" id={id}>
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

const components = {
  [diagramTag]: Diagram,
  [codeTag]: CodeBlock,
} as Partial<Components>;

export function PostBody({ body }: { body: Root }) {
  return (
    <div className="post-body">
      {toJsxRuntime(body, { Fragment, jsx, jsxs, components })}
    </div>
  );
}
