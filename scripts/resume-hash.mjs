import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";

const tex = process.argv[2];
if (!tex?.endsWith(".tex")) {
  console.error("Usage: node scripts/resume-hash.mjs <resume>.tex");
  process.exit(1);
}
const pdf = tex.replace(/\.tex$/, ".pdf");
const log = join(
  dirname(tex),
  ".build",
  basename(tex).replace(/\.tex$/, ".log"),
);

if (
  !existsSync(log) ||
  !existsSync(pdf) ||
  statSync(pdf).mtimeMs < statSync(log).mtimeMs
) {
  console.log(
    `${basename(pdf)} was not written by this build, which failed: the hash is left as it was.`,
  );
  process.exit(0);
}

function sha256(data) {
  return createHash("sha256").update(data).digest("hex");
}

const lines = [
  `${sha256(readFileSync(tex, "utf8").replaceAll("\r\n", "\n"))}  ${basename(tex)}`,
  `${sha256(readFileSync(pdf))}  ${basename(pdf)}`,
];
writeFileSync(tex.replace(/\.tex$/, ".sha256"), `${lines.join("\n")}\n`);
