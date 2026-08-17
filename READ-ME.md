# Fix for the broken OOO row, plus the OOO screen tweaks

Five files:

    board/lib/tv2.ts             fixes the overlapping row on the rotating board
    board/lib/client.ts          same fix on the classic board
    board/lib/css.ts             styling for that label
    board/lib/ooocss.ts          team chip, company mark, Helvetica Neue pickers
    board/app/ooo/OooEditor.tsx  team beside each name, company mark, small check

## The board bug

The OUT OF OFFICE label used a table cell with `colspan="5"` to span the TODAY
group. Under `table-layout: fixed` the browser gave that cell a single column's
width — 89px instead of the 228px it should have spanned — and pushed every
cell after it out of position, which is why the pipeline and unlocked figures
printed on top of each other.

The label now lives in the first TODAY cell and is absolutely positioned, so it
paints across the four empty cells beside it without taking part in the column
math. Verified by measuring: an out-of-office row now reports exactly the same
thirteen column widths as a normal row.

## OOO screen

- Team name shown beside each person, in both "Out today" and "Scheduled"
- Oaktree Funding Corporation, with the logo, above the heading
- The big green "connected" bar is gone; there is now a small green
  "✓ Connected" line under the subtitle. Hovering it names the auth mechanism.
- The person picker and both date fields now use Helvetica Neue

One note on the font: Helvetica Neue ships on Macs and iPhones. Windows and
Android don't have it, so those fall back to Helvetica then Arial, which is the
closest match available. If you want it identical everywhere it would need to be
loaded as a webfont, which is a separate change.
