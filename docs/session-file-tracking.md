# Session file tracking

Haicue records every file change an agent makes during a session as a hunk in a binary append-only log (`~/.haicue/cache/index/track-store-v0/records.hct`). Each record carries the file path, the before/after lines, surrounding context, and a wall-clock timestamp.

This lets you answer questions across a session after the fact -- without relying on git commits.

## What you can do with it

**Reconstruct any file at any past time**

```sh
node scripts/restore-hunks.mjs --at "35m ago" --summary
node scripts/restore-hunks.mjs --at "2026-07-11T14:00:00-07:00" src/engine/brain.ts
```

`--summary` prints hunk counts per file without writing anything. Drop it to write restore candidates to `/tmp/haicue-restorehunks-<timestamp>/`. Add `--apply` to write them back into the working tree after you have checked them.

**See what the agent touched most**

The hunk count per file (`before=N`) is a direct measure of activity. Files with high counts are the hot paths of the session.

**Partial revert without touching git**

If an agent modified files across several uncommitted sessions, you can restore individual files to a target time independently -- no stash, no reset, no branch gymnastics.

## Record format

The store is a length-prefixed binary stream. Records come in two kinds:

- Kind 3 (meta): path, timestamp, change kind (Add/Modify/Delete)
- Kind 4 (body): before/after lines, pre/post context for anchor-based placement

The `restore-hunks.mjs` script reads both kinds, pairs them by ID, and applies hunks forward or in reverse depending on whether the target time is before or after the current file state.

## Lookup cost

All operations scan the store sequentially. On a store with tens of thousands of hunks across a multi-day session, per-file lookups run at 3-5ms.

## Limitations

- Tracks only files touched during an active Haicue session. Files changed outside Haicue are not recorded.
- Reverse application can fail if the current file has diverged enough from the recorded context that the anchor lines are no longer present. The script reports these as `reverse failed` and continues.
- The store is not a replacement for git history. It covers the window between commits.
