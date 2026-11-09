import { resume } from "@/resume/claims";

export default function HomePage() {
  return (
    <>
      <h1 className="text-4xl/tight font-semibold tracking-tight">
        {resume.name}
      </h1>
      <p className="mt-2 font-sans text-base text-muted">{resume.headline}</p>
      <p className="mt-10">
        This site is being built in the open. Its source, the resume included,
        is on <a href="https://github.com/irfantayyab/portfolio">GitHub</a>, and
        the <a href="/resume.pdf">resume is a PDF</a> to read or save.
      </p>
    </>
  );
}
