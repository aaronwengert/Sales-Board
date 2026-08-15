# Sales Board — rotating TV view

Three files. Upload them to `aaronwengert/Sales-Board`, keeping the paths
exactly as they are in this zip. Vercel redeploys on push; nothing else to do.

    board/lib/tv2.ts        NEW      the rotating view
    board/lib/BoardView.tsx CHANGED  loads the rotating view alongside the classic one
    board/lib/board.ts      CHANGED  roster: House account + Adam Paniagua back on

Do not upload anything else. In particular, leave `board/public/logo.png` alone —
the copy already on GitHub is the correct OFC tree mark.

After the push you do not need to touch the TV. The board reloads itself every
five minutes and the pages are server-rendered on demand, so it picks up the new
version on its own once Vercel finishes building.

## Two versions, two URLs

    https://<your-board-url>/              classic — everything on one screen
    https://<your-board-url>/?tv=2         rotating — two screens

Same for the other channels: `/retail`, `/retail?tv=2`, `/correspondent`,
`/correspondent?tv=2`. The classic board is unchanged; the rotating view only
appears when `?tv=2` is in the address.

Telling them apart at a glance: the rotating view has a thin green countdown bar
across the top and the section name in the top-right corner ("TODAY & PIPELINE"
or "FUNDED & ON DECK"). The classic board has neither.

## Viewing hours

Rotation runs Monday to Friday, 7:00am to 7:00pm Arizona. Outside those hours —
evenings and all weekend — it holds on the first screen and the header reads
"Rotation paused · resumes Monday 7:00 AM". It starts itself again at 7:00am
without anyone touching the TV.

The five-minute data refresh keeps running while paused, so Monday morning opens
on current numbers and any deploy pushed over the weekend is already live.

To ignore the schedule and rotate around the clock, use `?tv=2&hours=0`.
Pressing a speed button also overrides the schedule until the next reload, so you
can demo the board in the evening without changing anything.

## Setting the rotation speed

The control is hidden by default so the TV shows a clean board.

1. Move the mouse, tap the screen, or press any key. The control fades in at the
   bottom right:

       ROTATE EVERY   15s  30s  45s  1m  2m   [ Pause ]

2. Click a speed. It takes effect immediately and the button stays highlighted.
3. Stop touching it. Eight seconds later it fades away on its own.

The choice is saved on that device and survives the five-minute reload. Left and
right arrow keys page manually. To lock the speed for everyone, use
`?tv=2&sec=45` — the URL wins over the buttons. `?tv=2&screen=s1` or `&screen=s2`
freezes on one screen.

## The daily goal marker

In the TODAY group, any category an AE has already cleared prints in bold green —
75+ outbound calls, 90+ talk minutes, 3+ tickets, or 1+ submission.

The GOAL column then shows:

    green circled check   at least one of the four met
    gold star + gold row  all four met in the same day
    nothing               none met yet

A clean sweep of all four also puts a gold rail down the left of the row and a
gold wash across it, so it reads from the back of the floor rather than needing
someone to spot a single glyph.

## Roster changes in board.ts

Three lists near the top of the file control who appears:

**RETIRE** — drops an AE off the board entirely on/after a date, production and
all. Adam Paniagua has been removed from this list, so he is back on the board.

**HOUSE** — Reese Rogers and Jeff Laux. No row, no rank, no daily goal, but every
dollar on their loans still counts in the tiles at the top, so removing a rep
never deletes production from the month.

**GOAL_DASH** — on the board, but the TODAY columns render as dashes and the AE
is left out of the daily-goal percentage. Adam Paniagua is on this list, which is
why his call and talk figures show as dashes. To show his live activity while
still keeping him out of the goal math, move him to `GOAL_EXEMPT` instead.

All of this affects the classic board as well as the rotating one.
