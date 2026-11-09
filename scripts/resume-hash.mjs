import { createHash } from "node:crypto";
import { readFileSync, statSync, writeFileSync } from "node:fs";
import { basename } from "node:path";

const tex = process.argv[2];
if (!tex?.endsWith(".tex")) {
  console.error("Usage: node scripts/resume-hash.mjs <resume>.tex");
  process.exit(1);
}
const pdf = tex.replace(/\.tex$/, ".pdf");

if (statSync(pdf).mtimeMs < statSync(tex).mtimeMs) {
  console.log(
    `${basename(pdf)} is older than ${basename(tex)}, so it was not built from it: the hash is left as it was.`,
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
