import { execSync } from "child_process";
import fs from "fs";

try {
  console.log("Running tsc check...");
  const stdout = execSync("npx tsc --noEmit", { encoding: "utf8" });
  console.log("TypeScript Check Output:\n", stdout || "SUCCESS: No errors found!");
} catch (err) {
  console.log("TypeScript Error Output:\n", err.stdout || err.message);
  fs.writeFileSync("scratch/tsc_errors.log", err.stdout || String(err));
}
