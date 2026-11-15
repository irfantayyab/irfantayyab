import path from "node:path";

const resumeDir = path.join(process.cwd(), "..", "..", "resume");

export const resumeTexPath = path.join(resumeDir, "Irfan_Tayyab_SWE.tex");
export const resumePdfPath = path.join(resumeDir, "Irfan_Tayyab_SWE.pdf");
export const resumeHashPath = path.join(resumeDir, "Irfan_Tayyab_SWE.sha256");

export const claimsPath = path.join(process.cwd(), "src", "resume", "claims.ts");
