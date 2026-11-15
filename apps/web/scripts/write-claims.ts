import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { claimsSource } from "../src/resume/claims-source.ts";

const texPath = path.resolve(
  import.meta.dirname,
  "../../../resume/Irfan_Tayyab_SWE.tex",
);
const claimsPath = path.resolve(import.meta.dirname, "../src/resume/claims.ts");

const [tex, current] = await Promise.all([
  readFile(texPath, "utf8"),
  readFile(claimsPath, "utf8"),
]);
const next = claimsSource(tex);

if (next === current) {
  console.log("claims.ts already matches the resume.");
} else {
  await writeFile(claimsPath, next);
  console.log("Wrote claims.ts from the resume.");
}
