# Sales Board — rotating TV view, out-of-office, roster changes

Eleven files. Upload them to `aaronwengert/Sales-Board`, keeping the paths
exactly as they are in this zip. Two of them are in new folders that GitHub will
create for you as you upload.

    board/lib/tv2.ts               NEW      the rotating TV view
    board/lib/ooo.ts               NEW      out-of-office storage
    board/lib/ooocss.ts            NEW      out-of-office screen styling
    board/app/ooo/page.tsx         NEW      the out-of-office screen
    board/app/ooo/OooEditor.tsx    NEW      the out-of-office form
    board/app/api/ooo/route.ts     NEW      saves absences
    board/lib/BoardView.tsx        CHANGED  loads the rotating view
    board/lib/board.ts             CHANGED  roster + out-of-office handling
    board/lib/fetch.ts             CHANGED  reads who is out today
    board/lib/client.ts            CHANGED  out-of-office on the classic board
    board/lib/css.ts               CHANGED  out-of-office label styling

Leave `board/public/logo.png` alone — the copy on GitHub is the correct one.

## One-time setup for out of office (2 minutes)

The screen needs somewhere to save. It uses Vercel Blob, which needs no schema
and no server.

1. Vercel dashboard → your team → **Storage** → **Create** → **Blob**.
2. Name it anything, e.g. `board-storage`.
3. Connect it to the **ae-leaderboard** project when prompted.

That's it — Vercel injects `BLOB_READ_WRITE_TOKEN` automatically. Redeploy (or
just push these files) and the screen works.

Until the store exists, `/ooo` still opens and shows a yellow banner explaining
what's missing, and the board runs exactly as it does today.

## Using it

Managers go to your board URL with `/ooo` on the end:

    https://<your-board-url>/ooo

It sits behind the same PIN as the board, so no new login. It is built for a
phone — big tap targets, native date pickers — because the real use is a manager
tapping this at 6:40am after a text from an AE.

Pick a person from the dropdown (grouped by team, so no typing and no typos),
pick the first day out, and optionally a last day for a vacation and a short
note. Leave the last day blank for a single day. The board reflects it within
five minutes.

The screen shows who is out today and what is scheduled ahead, each with a
Remove button. Absences expire on their own when the end date passes — nothing
to clean up. Entries older than 60 days are pruned automatically.

## What it does on the board

For anyone out that day, on both the classic and rotating views:

- the five TODAY cells collapse into one quiet "OUT OF OFFICE" label
- their name greys out
- they drop out of the daily-goal percentage entirely, numerator and denominator

Their pipeline, funded production and on-deck numbers are untouched — a day off
does not erase the month's work.

If storage is unreachable the board falls back to "nobody is out" and behaves
normally. It cannot break the board.

## Other sources (optional, for later)

`fetch.ts` checks three sources in order: the Blob store above, then a Google
Sheet if `OOO_SHEET_ID` is set, then an endpoint if `OOO_URL` is set. The
endpoint form is there for when the projections app is ready to serve:

    { "date": "2026-08-17", "ooo": ["Bryce Welker", "Mari Woods"] }

Switching over later means setting `OOO_URL` and removing the Blob store — no
code changes.

## Quick reference

    /                      classic board
    /ooo                   out-of-office screen
    /?tv=2                 rotating view, two screens, 30s each
    /?tv=2&sec=45          lock the rotation speed
    /?tv=2&screen=s1       freeze one screen
    /?tv=2&hours=0         ignore the Mon-Fri 7am-7pm schedule

Rotation runs Mon-Fri 7:00am-7:00pm Arizona and holds outside those hours.
Roster lists (RETIRE / HOUSE / GOAL_DASH) live at the top of `board.ts`.
