# Sales Board — rotating TV view

Three files. Upload them to `aaronwengert/Sales-Board`, keeping the paths
exactly as they are in this zip. Vercel redeploys on push; nothing else to do.

    board/lib/tv2.ts        NEW      the rotating view
    board/lib/BoardView.tsx CHANGED  loads the rotating view alongside the classic one
    board/lib/board.ts      CHANGED  roster: House account + Adam Paniagua back on

Do not upload anything else. In particular, leave `board/public/logo.png` alone —
the copy already on GitHub is the correct OFC tree mark.

After the push, you do not need to touch the TV. The board reloads itself every
five minutes and the pages are server-rendered on demand, so it picks up the new
version on its own once Vercel finishes building.

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

2. Click a speed. It takes effect immediately and the button stays highlighted.
3. Stop touching it. Eight seconds later it fades away on its own.

The choice is saved on that device and survives the five-minute reload, so you
set it once on the TV and forget it. Left and right arrow keys page manually.

To lock the speed for everyone, use `?tv=2&sec=45` instead — the URL wins over
the buttons. `?tv=2&screen=s1` or `&screen=s2` freezes on one screen.

## The daily goal marker

In the TODAY group, any category an AE has already cleared is printed in bold
green — 75+ outbound calls, 90+ talk minutes, 3+ tickets, or 1+ submission.

The GOAL column then shows:

    green circled check   at least one of the four categories met
    gold circled check    all four met in the same day
    nothing               none met yet

Gold requires a genuine clean sweep of all four. Note that the tickets feed is
currently landing empty, so the TIX column shows dashes and nobody can reach gold
until that feed is fixed. If you would rather gold mean "every category we are
actually measuring today," that is a one-line change in `tv2.ts` — look for
`all4` in the S1 row builder.

## Roster changes in board.ts

Three lists near the top of the file control who appears:

**RETIRE** — drops an AE off the board entirely on/after a date, production and
all. Adam Paniagua has been removed from this list, so he is back on the board
with his pipeline and funded production counting again.

**HOUSE** — Reese Rogers and Jeff Laux. No row, no rank, no daily goal, but every
dollar on their loans still counts in the tiles at the top, so removing a rep
never deletes production from the month.

**GOAL_DASH** — on the board, but the TODAY columns render as dashes and the AE
is left out of the daily-goal percentage. Adam Paniagua is on this list, which is
why his call and talk figures show as dashes. To show his live activity while
still keeping him out of the goal math, move him to `GOAL_EXEMPT` instead.

All of this affects the classic board as well as the rotating one.
