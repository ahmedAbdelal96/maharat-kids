import { createWriteStream, mkdirSync, readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { Transform } from "node:stream";

const port = process.env.PLAYWRIGHT_ACCEPTANCE_PORT ?? "3410";
const root = process.cwd();
const logRoot = resolve(root, ".next", "playwright");
mkdirSync(logRoot, { recursive: true });
const stdoutPath = resolve(logRoot, "server.stdout.log");
const stderrPath = resolve(logRoot, "server.stderr.log");
const nextCli = resolve(root, "node_modules", "next", "dist", "bin", "next");

// React reports an aborted response as "The destination stream closed early"
// when a browser navigation is intentionally superseded (redirects and page
// teardown do this routinely). Keep that expected request-level diagnostic out
// of the harness log, while preserving every genuine startup/runtime error.
let stderrBuffer = "";
let droppingExpectedAbort = false;
const stderrFilter = new Transform({
  transform(chunk, _encoding, callback) {
    stderrBuffer += String(chunk);
    const lines = stderrBuffer.split(/\r?\n/);
    stderrBuffer = lines.pop() ?? "";
    const kept = [];
    for (const line of lines) {
      if (line.includes("⨯ Error: The destination stream closed early.")) {
        droppingExpectedAbort = true;
        continue;
      }
      if (droppingExpectedAbort) {
        if (line.trim() === "}") droppingExpectedAbort = false;
        continue;
      }
      kept.push(`${line}\n`);
    }
    callback(null, kept.join(""));
  },
  flush(callback) {
    if (!droppingExpectedAbort && stderrBuffer) callback(null, stderrBuffer);
    else callback();
  },
});
const stdout = createWriteStream(stdoutPath, { flags: "w" });
const stderr = createWriteStream(stderrPath, { flags: "w" });

const child = spawn(process.execPath, [nextCli, "start", "--port", port], {
  cwd: root,
  env: { ...process.env, NODE_ENV: "production" },
  stdio: ["ignore", "pipe", "pipe"],
  windowsHide: true,
});
child.stdout.pipe(stdout);
child.stderr.pipe(stderrFilter).pipe(stderr);

let stopping = false;
function stop() {
  if (stopping || !child.pid) return;
  stopping = true;
  if (process.platform === "win32") {
    spawn("taskkill", ["/pid", String(child.pid), "/t", "/f"], { stdio: "ignore", windowsHide: true });
  } else {
    child.kill("SIGTERM");
  }
}

process.on("SIGINT", stop);
process.on("SIGTERM", stop);
process.on("exit", stop);

child.on("error", (error) => {
  console.error(`Acceptance server could not start: ${error.message}`);
  process.exitCode = 1;
});
child.on("exit", (code, signal) => {
  if (!stopping && code !== 0) {
    console.error(`Acceptance server exited before readiness (code=${code ?? "none"}, signal=${signal ?? "none"}).`);
    try {
      console.error(readFileSync(stderrPath, "utf8").slice(-12000));
    } catch {
      // Preserve the exit diagnostic even if the log could not be read.
    }
    process.exitCode = code ?? 1;
  }
  process.exit();
});

for (const stream of [stdout, stderr]) {
  stream.on("error", (error) => {
    console.error(`Acceptance server log could not be written: ${error.message}`);
    process.exitCode = 1;
  });
}
