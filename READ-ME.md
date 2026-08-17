# OUT OF OFFICE label — centred, and the grey block removed

Three files:

    board/lib/tv2.ts      centres the label; renames its cell class
    board/lib/css.ts      scopes the classic board's rule so it stops leaking
    board/lib/client.ts   matching change on the classic board

## Two things were wrong

**Off to the left.** The label was pinned 6px from the left of the first TODAY
cell rather than centred across the group. It is now positioned from measured
geometry after the table renders, not from arithmetic on the declared column
widths — the browser does not always hand out exactly the widths the colgroup
asks for, and computing it landed 14px off. Measured, it is exact.

**The grey block beside it.** The classic board's stylesheet defined a bare
`.ooo` class with a grey background. Both stylesheets load on the same page, so
that rule was also matching the rotating view's cell and painting it grey — the
empty block sitting to the left of the pill. The classic rule is now scoped to
`td.oooc span.ooo`, and the rotating view's cell was renamed to `tv2ooo` so the
two can never collide again.

Verified after the change: the label sits dead centre on the TODAY group (0px
off), stays inside it, the cell's background is transparent, and an
out-of-office row reports the same thirteen column widths as a normal row.
