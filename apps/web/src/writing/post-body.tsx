import type { Root } from "hast";
import { toJsxRuntime } from "hast-util-to-jsx-runtime";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";

export function PostBody({ body }: { body: Root }) {
  return (
    <div className="post-body">
      {toJsxRuntime(body, { Fragment, jsx, jsxs })}
    </div>
  );
}
