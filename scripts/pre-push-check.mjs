import { execFileSync, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { text } from "node:stream/consumers";

const env = Object.fromEntries(
  Object.entries(process.env).filter(([name]) => !name.startsWith("GIT_")),
);

function git(args, cwd) {
  return execFileSync("git", args, { cwd, env, encoding: "utf8" }).trim();
}

function run(command, cwd) {
  console.log(`\n> ${command}`);
  const result = spawnSync(command, {
    cwd,
    env,
    shell: true,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    console.error(`\nPush blocked: "${command}" failed in ${cwd}`);
    process.exit(result.status ?? 1);
  }
}

function pushedCommits(input) {
  const commits = input
    .split("\n")
    .map((line) => line.trim().split(/\s+/))
    .filter((fields) => fields.length === 4 && !/^0+$/.test(fields[1]))
    .map((fields) => fields[1]);
  return [...new Set(commits)];
}

const commits = pushedCommits(await text(process.stdin));

if (commits.length > 0) {
  const repository = git(["rev-parse", "--show-toplevel"], process.cwd());
  const commonDir = git(
    ["rev-parse", "--path-format=absolute", "--git-common-dir"],
    repository,
  );
  const checkDir = join(dirname(dirname(commonDir)), ".portfolio-push-check");

  git(["worktree", "prune"], repository);

  if (!existsSync(checkDir)) {
    git(["worktree", "add", "--detach", checkDir, commits[0]], repository);
  } else if (!existsSync(join(checkDir, ".git"))) {
    console.error(
      `Push blocked: ${checkDir} exists but is not a worktree. Move it away and push again.`,
    );
    process.exit(1);
  }

  for (const commit of commits) {
    console.log(`\nVerifying ${commit} in ${checkDir}`);
    git(["checkout", "--detach", "--force", commit], checkDir);
    git(["clean", "-fdx", "-e", "node_modules"], checkDir);
    run("pnpm install --frozen-lockfile", checkDir);
    run("pnpm verify", checkDir);
  }
}
