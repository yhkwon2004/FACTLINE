import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
const python =
  process.env.LOCAL_PYTHON ||
  path.join(
    process.cwd(),
    ".venv",
    process.platform === "win32" ? "Scripts/python.exe" : "bin/python",
  );
if (!existsSync(python))
  throw new Error("Create .venv and install ai/requirements.txt first.");
const child = spawn(
  python,
  ["-u", "ai/" + process.argv[2], ...process.argv.slice(3)],
  {
    stdio: "inherit",
    windowsHide: true,
    env: { ...process.env, PYTHONIOENCODING: "utf-8", HF_HUB_DISABLE_XET: "1" },
  },
);
child.on("exit", (code) => (process.exitCode = code ?? 1));
