import { CSS } from "@/lib/css";
import { SHELL } from "@/lib/shell";
import { CLIENT } from "@/lib/client";
import { TV2, TV2_CSS } from "@/lib/tv2";
import type { BoardData } from "@/lib/board";

// Shared render for all three channel boards. Only the injected board data
// (title, goal, rows) differs per route.
//
// There are exactly two ways to view a board, chosen by the URL:
//
//   /                the classic board — every column for every AE on one
//                    screen, no rotation. This is the default and is
//                    completely unchanged by the rotating view below.
//   /?tv=2           the rotating TV view — two screens, 30 seconds each,
//                    whole roster split into two columns per screen.
//
// The rotation code is inert unless ?tv=2 is present, so opening the plain
// URL can never land you in the rotating version by accident.
export function BoardView({ data }: { data: BoardData }) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS + TV2_CSS }} />
      <div dangerouslySetInnerHTML={{ __html: SHELL }} />
      <script dangerouslySetInnerHTML={{ __html: "window.__BOARD__=" + JSON.stringify(data) + ";\n" + CLIENT + "\n" + TV2 }} />
    </>
  );
}
