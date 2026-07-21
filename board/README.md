# Wholesale Sales Production board

Next.js app that renders the sales-floor TV board. Reads the newest CSVs from
two Google Drive folders (production Sales Board + call reports) via a Google
service account, computes the KPIs, and renders the board. Auto-refreshes every
5 minutes in the browser.

## Deploy
Hosted on Vercel (project: ae-leaderboard). Env vars live on the Vercel project:
GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, POWERBI_FOLDER_ID,
CALL_REPORTS_FOLDER_ID, CRON_SECRET. Pushing to this repo triggers a build.

## Structure
- app/page.tsx  – server component; fetches data, injects it, renders shell+client
- lib/fetch.ts  – reads newest CSVs from Drive
- lib/board.ts  – compute engine (teams, KPIs, goal logic)
- lib/css.ts / shell.ts / client.ts – the board's CSS, HTML shell, and browser JS
