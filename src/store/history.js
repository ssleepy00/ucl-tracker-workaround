// Append-only history store backed by a JSON Lines file (one JSON object per
// line). JSONL is used instead of a single JSON array so the file can grow
// cheaply (we just append) and be streamed/analysed later without loading the
// whole thing into memory — handy for the future busyness-over-time analysis.
//
// Each line is one poll snapshot:
// {
//   "ts": "2026-11-10T14:05:00.000Z",
//   "source": "mock",
//   "libraries": [
//     { "libraryId": "main", "name": "Main Library",
//       "occupied": 350, "total": 624, "free": 274,
//       "occupancy": 0.561, "rag": "green" },
//     ...
//   ]
// }

import { appendFile, readFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname } from 'node:path';
import { settings, classifyRAG } from '../config/settings.js';

async function ensureDirFor(file) {
  const dir = dirname(file);
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
}

/**
 * Build a normalised snapshot (adds occupancy fraction + RAG) from raw records.
 */
export function buildSnapshot(records, { source, ts = new Date() } = {}) {
  const libraries = records.map((r) => {
    const occupancy = r.total > 0 ? r.occupied / r.total : null;
    return {
      libraryId: r.libraryId,
      name: r.name,
      occupied: r.occupied,
      total: r.total,
      free: r.free,
      occupancy: occupancy == null ? null : Number(occupancy.toFixed(4)),
      rag: classifyRAG(occupancy),
    };
  });
  return { ts: ts.toISOString(), source, libraries };
}

/**
 * Append a snapshot to a specific history file (defaults to the runtime file).
 */
export async function appendSnapshot(snapshot, file = settings.historyFile) {
  await ensureDirFor(file);
  await appendFile(file, JSON.stringify(snapshot) + '\n', 'utf8');
}

// Read + parse one JSONL history file into an array of snapshots.
async function readFileSnapshots(file, since) {
  if (!existsSync(file)) return [];
  const raw = await readFile(file, 'utf8');
  const out = [];
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const obj = JSON.parse(trimmed);
      if (since && new Date(obj.ts) < since) continue;
      out.push(obj);
    } catch {
      // skip malformed line
    }
  }
  return out;
}

/**
 * Read history snapshots, optionally only those on/after `since` (a Date).
 *
 * Merges the COMMITTED file (durable data collected by GitHub Actions) with the
 * RUNTIME file (in-process poller / demo seed), de-duplicates by timestamp
 * (committed wins), and returns them sorted oldest-first. Malformed lines are
 * skipped defensively.
 */
export async function readHistory({ since } = {}) {
  const [committed, runtime] = await Promise.all([
    readFileSnapshots(settings.collectedHistoryFile, since),
    readFileSnapshots(settings.historyFile, since),
  ]);

  // De-dupe by timestamp; prefer committed (real) data over runtime/demo.
  const byTs = new Map();
  for (const snap of runtime) byTs.set(snap.ts, snap);
  for (const snap of committed) byTs.set(snap.ts, snap);

  return [...byTs.values()].sort((a, b) => new Date(a.ts) - new Date(b.ts));
}

/**
 * Return the most recent snapshot, or null if history is empty.
 */
export async function latestSnapshot() {
  const all = await readHistory();
  return all.length ? all[all.length - 1] : null;
}
