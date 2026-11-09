import { describe, expect, it } from "vitest";
import { parseResumeTex, texToText } from "./resume-tex";

const preamble = String.raw`
\newcommand{\job}[3]{#1, #2\hfill #3\par}
% \job{Role}{Company}{Dates}
\begin{document}
`;

function resumeWith(body: string) {
  return String.raw`${preamble}
{\namefont Ada Lovelace\par}
{\headlinefont Analytical Engineer\par}
${body}
\end{document}`;
}

describe("texToText", () => {
  it("turns escapes and dashes into the characters they print", () => {
    expect(texToText(String.raw`R\&D -- 50\% --- done`)).toBe(
      "R&D – 50% — done",
    );
  });

  it("keeps Unicode as it is and collapses whitespace", () => {
    expect(texToText(" Nov 2025 –\n  Oct 2026 ")).toBe("Nov 2025 – Oct 2026");
  });

  it("refuses markup it cannot turn into plain text", () => {
    expect(() => texToText(String.raw`\textbf{Lead}`)).toThrow(
      "Unsupported LaTeX",
    );
  });
});

describe("parseResumeTex", () => {
  it("reads the name, the headline and each section's jobs in order", () => {
    const tex = resumeWith(String.raw`
\section*{Education}
\job{BSc}{Some University}{}
\section*{Work Experience}
\job{Engineer}{R\&D Ltd}{Jan 2024 – Now}
\begin{itemize}
  \item Built \textbf{things}.
\end{itemize}
\job{Intern}{Acme}{2023}
\section*{Skills}
`);
    expect(parseResumeTex(tex)).toEqual({
      name: "Ada Lovelace",
      headline: "Analytical Engineer",
      sections: [
        {
          title: "Education",
          entries: [
            { title: "BSc", organisation: "Some University", dates: "" },
          ],
        },
        {
          title: "Work Experience",
          entries: [
            {
              title: "Engineer",
              organisation: "R&D Ltd",
              dates: "Jan 2024 – Now",
            },
            { title: "Intern", organisation: "Acme", dates: "2023" },
          ],
        },
      ],
    });
  });

  it("ignores jobs in comments and in the preamble", () => {
    const tex = resumeWith(String.raw`
\section*{Work Experience}
% \job{Old}{Gone}{2020}
\job{Engineer}{Acme}{2024} % \job{Also}{Gone}{2021}
`);
    expect(parseResumeTex(tex).sections).toEqual([
      {
        title: "Work Experience",
        entries: [{ title: "Engineer", organisation: "Acme", dates: "2024" }],
      },
    ]);
  });

  it("keeps an escaped percent sign instead of cutting the line there", () => {
    const tex = resumeWith(String.raw`
\section*{Work Experience}
\job{Engineer}{100\% Ltd}{2024}
`);
    expect(parseResumeTex(tex).sections[0]?.entries[0]?.organisation).toBe(
      "100% Ltd",
    );
  });

  it("fails on a job outside any section", () => {
    expect(() =>
      parseResumeTex(resumeWith(String.raw`\job{Engineer}{Acme}{2024}`)),
    ).toThrow("before any \\section*");
  });

  it("fails without a name or a headline", () => {
    expect(() =>
      parseResumeTex(String.raw`\begin{document}\end{document}`),
    ).toThrow("namefont");
  });
});
