import { projectPrefix, type Project } from "./projects";

export function ProjectName({ project }: { project: Project }) {
  const prefix = projectPrefix(project);
  return (
    <>
      {prefix ? (
        <span className="font-normal text-muted">{prefix} </span>
      ) : null}
      {project.name}
    </>
  );
}
