import { describe, expect, it } from "vitest";
import { parseResumeTex, texToText, texToUrl } from "./resume-tex";

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

  it("turns quotes into the curly ones XeLaTeX prints", () => {
    expect(texToText("Master's ``AI'' `ML'")).toBe("Master’s “AI” ‘ML’");
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

describe("texToUrl", () => {
  it("turns escapes into the characters they stand for, and nothing else", () => {
    expect(
      texToUrl(String.raw` https://x.test/a--b\_c?d=1\&e=50\%\#top `),
    ).toBe("https://x.test/a--b_c?d=1&e=50%#top");
  });

  it("refuses markup it cannot turn into a URL", () => {
    expect(() => texToUrl(String.raw`https://x.test/\textbf{a}`)).toThrow(
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
      emails: [],
      links: [],
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
      jobLinks: [
        { title: "BSc", organisation: "Some University", urls: [] },
        { title: "Engineer", organisation: "R&D Ltd", urls: [] },
        { title: "Intern", organisation: "Acme", urls: [] },
      ],
    });
  });

  it("reads each job's own links, up to the next job or section", () => {
    const tex = resumeWith(String.raw`
\bluelink{https://github.com/ada}{github.com/ada}\par
\section*{Work Experience}
\job{Engineer}{Acme}{2024}
\begin{itemize}
  \item Merged (\href{https://github.com/acme/pull/1}{PR}).
  % \item Old (\href{https://gone.example.com}{gone}).
  \item Shipped \project{https://acme.test/a\_b}{a demo}.
\end{itemize}
\job{Intern}{Initech}{2023}
\section*{Projects}
\project{https://example.com/side}{Side project}
`);
    expect(parseResumeTex(tex).jobLinks).toEqual([
      {
        title: "Engineer",
        organisation: "Acme",
        urls: ["https://github.com/acme/pull/1", "https://acme.test/a_b"],
      },
      { title: "Intern", organisation: "Initech", urls: [] },
    ]);
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

  it("reads the contact links and email in order, ignoring other links", () => {
    const tex = resumeWith(String.raw`
ada@example.co.uk\quad London\par
\bluelink{https://github.com/ada}{github.com/ada}\quad
% \bluelink{https://old.example.com}{old.example.com}
\bluelink{ https://example.com/ }{R\&D -- site}\par
\section*{Work Experience}
\job{Engineer}{Acme}{2024}
\begin{itemize}
  \item Merged (\href{https://github.com/acme/pull/1}{PR}).
\end{itemize}
`);
    const resume = parseResumeTex(tex);
    expect(resume.emails).toEqual(["ada@example.co.uk"]);
    expect(resume.links).toEqual([
      { url: "https://github.com/ada", label: "github.com/ada" },
      { url: "https://example.com/", label: "R&D – site" },
    ]);
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
