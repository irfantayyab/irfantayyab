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

function skip(reason) {
  console.log(`${reason}: the hash is left as it was.`);
  process.exit(0);
}

if (!existsSync(log) || !existsSync(pdf)) {
  skip(`No build of ${basename(tex)} has made a log and a PDF yet`);
}
if (statSync(log).mtimeMs < statSync(tex).mtimeMs) {
  skip(`XeLaTeX did not run on ${basename(tex)} since it was saved`);
}
if (statSync(pdf).mtimeMs < statSync(log).mtimeMs) {
  skip(`${basename(pdf)} was not written by this build, which failed`);
}

function sha256(data) {
  return createHash("sha256").update(data).digest("hex");
}

const lines = [
  `${sha256(readFileSync(tex, "utf8").replaceAll("\r\n", "\n"))}  ${basename(tex)}`,
  `${sha256(readFileSync(pdf))}  ${basename(pdf)}`,
];
writeFileSync(tex.replace(/\.tex$/, ".sha256"), `${lines.join("\n")}\n`);
