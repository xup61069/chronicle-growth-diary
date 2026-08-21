import { spawnSync } from "node:child_process";

const patterns = [
  ["private-key", "-----BEGIN " + "(RSA |EC |OPENSSH )?PRIVATE KEY-----"],
  ["aws-access-key", "AK" + "IA[0-9A-Z]{16}"],
  ["github-token", "gh" + "[pousr]_[A-Za-z0-9_]{30,}"],
  ["openai-key", "s" + "k-(proj-)?[A-Za-z0-9_-]{20,}"],
  ["stripe-live-key", "sk" + "_live_[A-Za-z0-9_]+"],
  ["slack-token", "x" + "ox[baprs]-[A-Za-z0-9-]+"],
  ["google-api-key", "AI" + "za[0-9A-Za-z_-]{30,}"],
];

function git(args) {
  return spawnSync("git", args, { encoding: "utf8" });
}

function hasPattern(pattern, revision) {
  const args = ["grep", "-I", "-q", "-E", pattern];
  if (revision) args.push(revision);
  args.push("--");
  return git(args).status === 0;
}

const findings = [];
for (const [name, pattern] of patterns) {
  if (hasPattern(pattern)) findings.push({ scope: "working-tree", pattern: name });
}

const revisions = git(["rev-list", "--all"]);
if (revisions.status !== 0) throw new Error("無法讀取 Git 歷史以執行 secret scan。");
for (const revision of revisions.stdout.split("\n").filter(Boolean)) {
  for (const [name, pattern] of patterns) {
    if (hasPattern(pattern, revision)) findings.push({ scope: revision.slice(0, 12), pattern: name });
  }
}

if (findings.length) {
  console.error(JSON.stringify({ status: "failed", findings }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ status: "passed", scannedRevisions: revisions.stdout.split("\n").filter(Boolean).length, patterns: patterns.map(([name]) => name) }));
