import { describe, expect, it } from "vitest";
import {
  ClaimsError,
  claimsFrom,
  claimsHeader,
  claimsSource,
} from "./claims-source";
import type { ResumeTex } from "./resume-tex";

const links = [
  { url: "https://www.linkedin.com/in/ada/", label: "linkedin.com/in/ada" },
  { url: "https://github.com/ada", label: "github.com/ada" },
  { url: "https://ada.dev", label: "ada.dev" },
];

const job = { title: "Engineer", organisation: "Engines Ltd", dates: "2024" };
const degree = { title: "BS in Maths", organisation: "A University", dates: "" };

function tex(overrides: Partial<ResumeTex> = {}): ResumeTex {
  return {
    name: "Ada Lovelace",
    headline: "Analytical Engineer",
    emails: ["ada@ada.dev"],
    links,
    sections: [
      { title: "Education", entries: [degree] },
      { title: "Work Experience", entries: [job] },
    ],
    jobLinks: [
      { ...degree, urls: [] },
      { ...job, urls: ["https://ada.dev/engine", "https://ada.dev/other"] },
    ],
    ...overrides,
  };
}

describe("claimsFrom", () => {
  it("names each header link by its site, and keeps each job's first link", () => {
    expect(claimsFrom(tex())).toEqual({
      name: "Ada Lovelace",
      headline: "Analytical Engineer",
      email: "ada@ada.dev",
      links: { linkedin: links[0], github: links[1], website: links[2] },
      education: [degree],
      experience: [job],
      jobLinks: { "Engines Ltd": "https://ada.dev/engine" },
    });
  });

  it("links no degree, even when the resume links one", () => {
    const linked = tex({
      jobLinks: [{ ...degree, urls: ["https://uni.example"] }],
    });
    expect(claimsFrom(linked).jobLinks).toEqual({});
  });

  it("refuses a resume without exactly one email address", () => {
    expect(() => claimsFrom(tex({ emails: [] }))).toThrow(ClaimsError);
    expect(() => claimsFrom(tex({ emails: ["a@a.dev", "b@b.dev"] }))).toThrow(
      /exactly one email/,
    );
  });

  it("refuses a header missing one of its links, or holding two of a kind", () => {
    expect(() => claimsFrom(tex({ links: links.slice(0, 2) }))).toThrow(
      /LinkedIn, GitHub and one website/,
    );
    expect(() =>
      claimsFrom(tex({ links: [...links, { url: "https://github.com/b", label: "b" }] })),
    ).toThrow(/more than one github/);
  });

  it("refuses a section the site does not show, and a missing one", () => {
    expect(() =>
      claimsFrom(
        tex({
          sections: [
            ...tex().sections,
            { title: "Awards", entries: [job] },
          ],
        }),
      ),
    ).toThrow(/Awards/);
    expect(() =>
      claimsFrom(tex({ sections: [{ title: "Work Experience", entries: [job] }] })),
    ).toThrow(/"Education"/);
  });
});

describe("claimsSource", () => {
  const source = String.raw`
\begin{document}
{\namefont Ada Lovelace\par}
{\headlinefont Analytical Engineer\par}
ada@ada.dev \bluelink{https://www.linkedin.com/in/ada/}{linkedin.com/in/ada}
\bluelink{https://github.com/ada}{github.com/ada} \bluelink{https://ada.dev}{ada.dev}
\section*{Education}
\job{BS in Maths}{A University}{}
\section*{Work Experience}
\job{Engineer}{Engines Ltd}{Jan 2024 -- Now}
\href{https://ada.dev/engine}{The engine}
\end{document}`;

  it("writes the claims as a module, each object across its own lines", () => {
    const written = claimsSource(source);
    expect(written.startsWith(`${claimsHeader}\n`)).toBe(true);
    expect(written).toContain(`  experience: [
    {
      title: "Engineer",
      organisation: "Engines Ltd",
      dates: "Jan 2024 – Now",
    },
  ],
  jobLinks: {
    "Engines Ltd": "https://ada.dev/engine",
  },
} as const satisfies {`);
    expect(written.endsWith("};\n")).toBe(true);
  });
});
