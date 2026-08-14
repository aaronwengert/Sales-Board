# Sales Board — rotating TV view

Three files. Upload them to `aaronwengert/Sales-Board`, keeping the paths
exactly as they are in this zip. Vercel redeploys on push; nothing else to do.

    board/lib/tv2.ts        NEW      the rotating view
    board/lib/BoardView.tsx CHANGED  loads the rotating view alongside the classic one
    board/lib/board.ts      CHANGED  roster: House account + Adam Paniagua back on

Do not upload anything else. In particular, leave `board/public/logo.png` alone —
the copy already on GitHub is the correct OFC tree mark.

## Two versions, two URLs

The classic board is unchanged and is still what a plain URL gives you. The
rotating view only ever appears if `?tv=2` is in the address.

    https://<your-board-url>/              classic — everything on one screen
    https://<your-board-url>/?tv=2         rotating — two screens

Same for the other channels: `/retail`, `/retail?tv=2`, `/correspondent`,
`/correspondent?tv=2`.

Telling them apart at a glance: the rotating view has a thin green countdown bar
across the very top of the screen and the section name in the top-right corner
("TODAY & PIPELINE" or "FUNDED & ON DECK"). The classic board has neither.

## Setting the rotation speed

The control is hidden by default so the TV shows a clean board.

1. Move the mouse, tap the screen, or press any key. The control fades in at the
   bottom right:

       ROTATE EVERY   15s  30s  45s  1m  2m   [ Pause ]

2. Click a speed. It takes effect immediately — the countdown bar restarts at the
   new length — and the button you picked stays highlighted green.
3. Stop touching it. Eight seconds later the control fades away on its own. The
   board keeps rotating at the speed you chose.

The choice is saved on that device, so it survives the board's own five-minute
reload and a browser restart. Set it once on the TV and it stays until someone
changes it. Pause holds the current screen until you press Resume. Left and right
arrow keys page manually without changing the speed.

To lock the speed for everyone and skip the control, put it in the URL instead —
`?tv=2&sec=45` — which wins over the buttons. `?tv=2&screen=s1` or `&screen=s2`
freezes on one screen with no rotation.

## Roster changes in board.ts

Three lists near the top of the file control who appears:

**RETIRE** — drops an AE off the board entirely on/after a date, production and
all. Adam Paniagua was here with 2026-08-01 and has now been removed, so he is
back on the board with his pipeline and funded production counting again.

**HOUSE** — Reese Rogers and Jeff Laux. No row on the board, no rank, no daily
goal, but every dollar on their loans still counts in the tiles at the top, so
removing a rep never deletes production from the month. There is no visible
"House" row; the money just lives in the totals.

**GOAL_DASH** — on the board, but the TODAY columns render as dashes and the AE
is left out of the daily-goal percentage entirely. Adam Paniagua is on this list,
which is why his call and talk figures show as dashes.

If you later want Adam's live activity to show while still keeping him out of the
goal math, move his name from `GOAL_DASH` to `GOAL_EXEMPT` — same exemption, but
the TODAY numbers stay visible.

All of this affects the classic board as well as the rotating one.
