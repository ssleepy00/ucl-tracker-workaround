// Collector: fetch current occupancy once and append a snapshot to the
// COMMITTED history file (data/history.collected.jsonl). This is what the
// GitHub Actions cron job runs; the Action then commits the updated file, so
// real occupancy history accumulates in version control — durable, free, and
// available to anyone who clones the repo.
//
// Usage:
//   DATA_SOURCE=scrape SCRAPER_URL_TEMPLATE=... SCRAPER_API_KEY=... \
//     node src/scripts/collect.js
//
// Exits non-zero on failure so the CI job is marked failed (and you get
// notified) rather than silently committing nothing.

import { fetchCurrentOccupancy, activeSourceName } from '../sources/index.js';
import { buildSnapshot, appendSnapshot } from '../store/history.js';
import { settings } from '../config/settings.js';

try {
  const records = await fetchCurrentOccupancy();
  const snapshot = buildSnapshot(records, { source: activeSourceName() });

  // Write to the committed (durable) file, not the ephemeral runtime file.
  await appendSnapshot(snapshot, settings.collectedHistoryFile);

  const open = snapshot.libraries.length;
  console.log(
    `[collect] ${snapshot.ts} source=${snapshot.source} libraries=${open} -> ${settings.collectedHistoryFile}`,
  );
  process.exit(0);
} catch (err) {
  console.error('[collect] failed:', err.message);
  process.exit(1);
}
