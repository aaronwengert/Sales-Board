# Sales Board — rotating TV view

Three files. Upload them to `aaronwengert/Sales-Board`, keeping the paths
exactly as they are in this zip. Vercel redeploys on push; nothing else to do.

    board/lib/tv2.ts        NEW    the rotating view
    board/lib/BoardView.tsx CHANGED  loads the rotating view alongside the classic one
    board/lib/board.ts      CHANGED  House account (Reese Rogers, Jeff Laux)

Do not upload anything else. In particular, leave `board/public/logo.png` alone —
the copy already on GitHub is the correct OFC tree mark.

## Two versions, two URLs

The classic board is unchanged and is still what a plain URL gives you. The
rotating view only ever appears if `?tv=2` is in the address.

    https://<your-board-url>/              classic — everything on one screen
    https://<your-board-url>/?tv=2         rotating — two screens, 30s each

Same for the other channels: `/retail`, `/retail?tv=2`, `/correspondent`,
`/correspondent?tv=2`.

Telling them apart at a glance: the rotating view has a green countdown bar
across the very top of the screen and the section name in the top-right corner
("TODAY & PIPELINE" or "FUNDED & ON DECK"). The classic board has neither.

### Options on the rotating view

    ?tv=2&sec=45       change the dwell from 30 seconds to 45
    ?tv=2&screen=s1    freeze on screen 1, no rotation
    ?tv=2&screen=s2    freeze on screen 2, no rotation

Bookmark `?tv=2` on the TV browser and leave it. The page still reloads its data
every five minutes on its own, and the rotation restarts from screen 1 after
each reload.

## What changed in board.ts

Reese Rogers and Jeff Laux no longer appear as rows. Their loans still count in
the tiles at the top — Reese's funded production stays inside the FUNDED
PRODUCTION number rather than disappearing from the month. There is no visible
"House" row; the money simply lives in the totals.

To add someone to the House account later, add their name to the `HOUSE` set
near the top of `board.ts`. To remove someone from the board entirely, along
with their production, use the existing `RETIRE` list instead.
