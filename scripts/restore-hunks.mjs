#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { execFileSync } from "node:child_process";

const MAGIC = Buffer.from("HCTRACK0\n", "utf8");
const DEFAULT_STORE = join(homedir(), ".haicue", "cache", "index", "track-store-v0", "records.hct");

function usage() {
  console.log(`Usage:
  node scripts/restore-hunks.mjs --at <time> [files...]
  node scripts/restore-hunks.mjs --at <time> --apply [files...]

Options:
  --at <time>       Target wall-clock time. Examples: "2026-06-23T02:31:26-07:00", "35m ago".
  --store <path>    Track store records.hct path. Defaults to ~/.haicue/cache/index/track-store-v0/records.hct.
  --out <dir>       Candidate output dir. Defaults to /tmp/haicue-restorehunks-<timestamp>.
  --root <dir>      Repo root. Defaults to the current working directory.
  --apply           Write candidates back into --root after generation.
  --summary         Print hunk counts only; do not write candidates.
  --help            Show this help.

By default this writes restore candidates only. Use --apply only after checking
the generated files.`);
}

function parseArgs(argv) {
  const args = {
    at: "",
    store: DEFAULT_STORE,
    root: process.cwd(),
    out: "",
    apply: false,
    summary: false,
    files: [],
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      usage();
      process.exit(0);
    } else if (arg === "--at") {
      args.at = argv[++i] ?? "";
    } else if (arg === "--store") {
      args.store = argv[++i] ?? "";
    } else if (arg === "--root") {
      args.root = argv[++i] ?? "";
    } else if (arg === "--out") {
      args.out = argv[++i] ?? "";
    } else if (arg === "--apply") {
      args.apply = true;
    } else if (arg === "--summary") {
      args.summary = true;
    } else if (arg.startsWith("--")) {
      throw new Error(`unknown option: ${arg}`);
    } else {
      args.files.push(arg);
    }
  }
  if (!args.at) throw new Error("--at is required");
  args.root = resolve(args.root);
  args.store = resolve(args.store.replace(/^~/, homedir()));
  args.out = args.out ? resolve(args.out) : join("/tmp", `haicue-restorehunks-${Date.now()}`);
  return args;
}

function parseTargetTime(input) {
  const trimmed = input.trim();
  const relative = trimmed.match(/^(\d+)\s*(s|sec|secs|m|min|mins|h|hr|hrs)\s+ago$/i);
  if (relative) {
    const amount = Number(relative[1]);
    const unit = relative[2].toLowerCase();
    const scale = unit.startsWith("s") ? 1000 : unit.startsWith("m") ? 60_000 : 3_600_000;
    return Date.now() - amount * scale;
  }
  const parsed = Date.parse(trimmed);
  if (!Number.isFinite(parsed)) throw new Error(`invalid --at time: ${input}`);
  return parsed;
}

function readRecords(storePath) {
  const raw = readFileSync(storePath);
  if (!raw.subarray(0, MAGIC.length).equals(MAGIC)) {
    throw new Error(`not a track-store-v0 records file: ${storePath}`);
  }
  const metas = new Map();
  const bodies = new Map();
  let offset = MAGIC.length;
  while (offset < raw.length) {
    const len = raw.readUInt32LE(offset);
    const kind = raw.readUInt8(offset + 4);
    offset += 9;
    const payload = raw.subarray(offset, offset + len);
    offset += len;
    if (kind !== 3 && kind !== 4) continue;
    let record;
    try {
      record = JSON.parse(payload.toString("utf8"));
    } catch {
      continue;
    }
    if (kind === 3) metas.set(record.id, record);
    else bodies.set(record.id, record);
  }
  return { metas, bodies };
}

function gitTrackedFiles(root) {
  const out = execFileSync("git", ["ls-files"], { cwd: root, encoding: "utf8" });
  return out.split("\n").filter(Boolean);
}

function normalizeFile(root, file) {
  const abs = resolve(root, file);
  return { rel: relative(root, abs), abs };
}

function linesOf(text) {
  return text.length ? text.replace(/\n$/, "").split("\n") : [];
}

function findSeq(lines, seq) {
  if (seq.length === 0) return -1;
  outer: for (let i = 0; i <= lines.length - seq.length; i += 1) {
    for (let j = 0; j < seq.length; j += 1) {
      if (lines[i + j] !== seq[j]) continue outer;
    }
    return i;
  }
  return -1;
}

function replaceSeq(lines, from, to) {
  const index = findSeq(lines, from);
  if (index < 0) return false;
  lines.splice(index, from.length, ...to);
  return true;
}

function insertByContext(lines, hunk, insert) {
  const pre = hunk.body.pre_context ?? [];
  const post = hunk.body.post_context ?? [];
  if (pre.length) {
    const index = findSeq(lines, pre);
    if (index >= 0) {
      lines.splice(index + pre.length, 0, ...insert);
      return true;
    }
  }
  if (post.length) {
    const index = findSeq(lines, post);
    if (index >= 0) {
      lines.splice(index, 0, ...insert);
      return true;
    }
  }
  return false;
}

function applyForward(lines, hunk) {
  const before = hunk.body.before ?? [];
  const after = hunk.body.after ?? [];
  if (hunk.meta.kind === "Add") {
    if (
      lines.length === 0 &&
      before.length === 0 &&
      (hunk.body.pre_context ?? []).length === 0 &&
      (hunk.body.post_context ?? []).length === 0
    ) {
      lines.splice(0, 0, ...after);
      return true;
    }
    return insertByContext(lines, hunk, after);
  }
  if (hunk.meta.kind === "Delete") return replaceSeq(lines, before, []);
  return replaceSeq(lines, before, after);
}

function applyReverse(lines, hunk) {
  const before = hunk.body.before ?? [];
  const after = hunk.body.after ?? [];
  if (hunk.meta.kind === "Add") return replaceSeq(lines, after, []);
  if (hunk.meta.kind === "Delete") return insertByContext(lines, hunk, before);
  return replaceSeq(lines, after, before);
}

function isFullFileHunk(hunk) {
  const before = hunk.body.before ?? [];
  const after = hunk.body.after ?? [];
  return (
    (hunk.body.pre_context ?? []).length === 0 &&
    (hunk.body.post_context ?? []).length === 0 &&
    (before.length > 80 || after.length > 80)
  );
}

function candidateForFile({ root, rel, abs, hunks, targetMs }) {
  const beforeTarget = hunks.filter((hunk) => hunk.meta.at <= targetMs);
  const afterTarget = hunks.filter((hunk) => hunk.meta.at > targetMs);
  const notes = [];
  let lines;

  const fullBefore = beforeTarget.filter(isFullFileHunk).at(-1);
  if (fullBefore && fullBefore.meta.kind === "Add") {
    lines = [...(fullBefore.body.after ?? [])];
    notes.push(`base: full add ${fullBefore.meta.id}`);
    for (const hunk of beforeTarget.filter((h) => h.meta.at > fullBefore.meta.at)) {
      if (!applyForward(lines, hunk)) {
        notes.push(`forward failed: ${hunk.meta.id} ${hunk.meta.kind}`);
      }
    }
  } else if (existsSync(abs)) {
    lines = linesOf(readFileSync(abs, "utf8"));
    for (const hunk of [...afterTarget].sort((a, b) => b.meta.at - a.meta.at)) {
      if (hunk.meta.kind === "Add" && isFullFileHunk(hunk)) {
        notes.push(`skipped post-target full add: ${hunk.meta.id}`);
        continue;
      }
      if (!applyReverse(lines, hunk)) {
        notes.push(`reverse failed: ${hunk.meta.id} ${hunk.meta.kind}`);
      }
    }
  } else {
    lines = [];
    notes.push("missing current file and no full pre-target add");
  }

  return {
    rel,
    text: `${lines.join("\n")}\n`,
    hunksBefore: beforeTarget.length,
    hunksAfter: afterTarget.length,
    notes,
    changed: existsSync(abs) ? readFileSync(abs, "utf8") !== `${lines.join("\n")}\n` : true,
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const targetMs = parseTargetTime(args.at);
  const { metas, bodies } = readRecords(args.store);
  const files = args.files.length ? args.files : gitTrackedFiles(args.root);
  const normalizedFiles = files.map((file) => normalizeFile(args.root, file));

  console.log(`target: ${new Date(targetMs).toISOString()}`);
  console.log(`store:  ${args.store}`);
  console.log(`root:   ${args.root}`);
  if (!args.summary) console.log(`out:    ${args.out}`);

  const candidates = [];
  for (const file of normalizedFiles) {
    const hunks = [];
    for (const meta of metas.values()) {
      if (meta.path !== file.abs) continue;
      hunks.push({ meta, body: bodies.get(meta.id) ?? {} });
    }
    hunks.sort((a, b) => a.meta.at - b.meta.at);
    if (hunks.length === 0) continue;
    const candidate = candidateForFile({
      root: args.root,
      rel: file.rel,
      abs: file.abs,
      hunks,
      targetMs,
    });
    candidates.push(candidate);
    const noteText = candidate.notes.length ? ` notes=${candidate.notes.join("; ")}` : "";
    console.log(
      `${candidate.changed ? "*" : " "} ${candidate.rel} before=${candidate.hunksBefore} after=${candidate.hunksAfter}${noteText}`,
    );
  }

  if (args.summary) return;
  mkdirSync(args.out, { recursive: true });
  for (const candidate of candidates) {
    const outPath = join(args.out, candidate.rel);
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, candidate.text);
    if (args.apply && candidate.changed) {
      const dest = join(args.root, candidate.rel);
      mkdirSync(dirname(dest), { recursive: true });
      writeFileSync(dest, candidate.text);
    }
  }
  if (args.apply) console.log("applied candidates to worktree");
  else console.log("wrote candidates only; inspect them before using --apply");
}

main();
