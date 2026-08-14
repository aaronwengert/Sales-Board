# Sales Board — rotating TV view

Three files. Upload them to `aaronwengert/Sales-Board`, keeping the paths
exactly as they are in this zip. Vercel redeploys on push; nothing else to do.

    board/lib/tv2.ts        NEW      the rotating view
    board/lib/BoardView.tsx CHANGED  loads the rotating view alongside the classic one
    board/lib/board.ts      CHANGED  House account (Reese Rogers, Jeff Laux)

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

## What changed in board.ts

Reese Rogers and Jeff Laux no longer appear as rows. Their loans still count in
the tiles at the top — Reese's funded production stays inside the FUNDED
PRODUCTION number rather than disappearing from the month. There is no visible
"House" row; the money simply lives in the totals.

To add someone to the House account later, add their name to the `HOUSE` set
near the top of `board.ts`. To remove someone from the board entirely, along
with their production, use the existing `RETIRE` list instead.

Note this affects the classic board too — Reese and Jeff are gone from both
views, which is almost certainly what you want, but it is worth knowing before
you push.
