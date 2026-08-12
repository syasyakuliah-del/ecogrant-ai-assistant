import { execSync } from "child_process";

try {
  console.log("Running unit and integration tests...");
  const out1 = execSync("node --input-type=module -e \"import './tests/app.test.ts'\"", { encoding: "utf8" });
  console.log(out1);
} catch (e) {
  console.log("Unit test output:", e.stdout || e.message);
}

try {
  console.log("Running security and e2e audit tests...");
  const out2 = execSync("node --input-type=module -e \"import './tests/security_and_e2e.ts'\"", { encoding: "utf8" });
  console.log(out2);
} catch (e) {
  console.log("Security test output:", e.stdout || e.message);
}
