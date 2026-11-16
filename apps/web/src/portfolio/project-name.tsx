import { openSourcePrefix, type Project } from "./projects";

export function ProjectName({ project }: { project: Project }) {
  return (
    <>
      {project.openSource ? (
        <span className="font-normal text-muted">{openSourcePrefix} </span>
      ) : null}
      {project.name}
    </>
  );
}
