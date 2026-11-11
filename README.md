# UCLLibraryTracker

See how full each UCL library is, at a glance, on a map.

> ⚠️ Student project — **not** an official UCL service.

## What it does

- Shows every UCL library on a map, each marked by how busy it is right now:
  - 🟢 **Green** — plenty of space (under 60% full)
  - 🟠 **Amber** — filling up (60–85% full)
  - 🔴 **Red** — very busy (over 85% full)
- Find libraries **near you** — it can use your location to centre the map and
  sort libraries nearest-first.
- Click a library to see how many desks are free, get **directions** to it, and
  view a **busyness graph** showing how full it gets through the day.

## How to access it

```bash
npm install
npm start
```

Then open **http://localhost:3000** in your browser.

It runs straight away with **demo data** so you can try it immediately — the
busyness graph is pre-populated so there's something to see. To show real live
occupancy instead, copy `.env.example` to `.env` and follow the notes inside it.

## Put it online (shareable link)

The repo includes a `render.yaml`, so you can deploy a public demo for free on
[Render](https://render.com): sign in with GitHub, choose **New → Blueprint**,
and pick this repo. Render builds it and gives you a public URL.

> The free tier runs on demo data and sleeps when idle (first visit after a nap
> takes ~30–60s to wake). The demo busyness graph is regenerated on each boot.

## Collecting real data (for free, via GitHub Actions)

Instead of running a server 24/7 to log occupancy, this repo collects data with
a **scheduled GitHub Action** (`.github/workflows/collect.yml`). On a schedule
it fetches one snapshot and commits it to `data/history.collected.jsonl`, so
real busyness history builds up **in the repo itself** — durable, free, and
available to anyone who clones it. The website reads this committed history, so
your graphs fill with real data even on a free (ephemeral) host.

**To turn on real collection:**

1. Sign up for a scraping provider (needed because UCL's feed is behind
   Cloudflare — see `.env.example` for provider templates) and get an API key.
2. In the repo: **Settings → Secrets and variables → Actions**
   - add **secrets** `SCRAPER_URL_TEMPLATE` and `SCRAPER_API_KEY`
   - add a **variable** `DATA_SOURCE` = `scrape`
3. That's it. The Action runs hourly (07:00–23:00 UTC by default). Change the
   `cron:` in the workflow to collect more or less often to suit your provider's
   free-tier credits. You can also trigger it manually from the **Actions** tab.

Until you configure the secrets, the Action safely runs on **mock** data, so you
can test the collect-and-commit flow first.

Run a collection locally any time with:

```bash
npm run collect
```

## License

MIT
