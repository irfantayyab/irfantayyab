import { describe, expect, it } from "vitest";
import { toMarkdown } from "./markdown.ts";

describe("toMarkdown", () => {
  it("keeps a code block's language and its lines as written", () => {
    expect(
      toMarkdown(
        '<p><strong>a.mjs</strong></p><pre><code class="language-js">if (a) {\n  b();\n}</code></pre>',
      ),
    ).toBe("**a.mjs**\n\n```js\nif (a) {\n  b();\n}\n```\n");
  });

  it("writes a diagram as its image, with its description below", () => {
    expect(
      toMarkdown(
        '<p><img src="https://a.dev/writing/p/diagram-1.png" alt="A title"></p><p>What it shows.</p>',
      ),
    ).toBe(
      "![A title](https://a.dev/writing/p/diagram-1.png)\n\nWhat it shows.\n",
    );
  });

  it("writes a callout as a quote led by its bold label", () => {
    expect(
      toMarkdown(
        "<blockquote><p><strong>Note:</strong> Mind it.</p></blockquote>",
      ),
    ).toBe("> **Note:** Mind it.\n");
  });

  it("keeps tables, links and headings", () => {
    expect(
      toMarkdown(
        '<h2 id="a">A</h2><p>See <a href="https://a.dev/x">x</a>.</p><table><thead><tr><th>a</th></tr></thead><tbody><tr><td>1</td></tr></tbody></table>',
      ),
    ).toBe("## A\n\nSee [x](https://a.dev/x).\n\n| a |\n| - |\n| 1 |\n");
  });

  it("keeps a figure's image and its caption", () => {
    expect(
      toMarkdown(
        '<figure><img src="https://a.dev/a.webp" alt="Alt"><figcaption>Caption</figcaption></figure>',
      ),
    ).toMatch(/!\[Alt\]\(https:\/\/a\.dev\/a\.webp\)[\s\S]*Caption/);
  });
});
