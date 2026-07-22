import { CSS } from "@/lib/css";
import { SHELL } from "@/lib/shell";
import { CLIENT } from "@/lib/client";
import type { BoardData } from "@/lib/board";

// Shared render for all three channel boards. Only the injected board data
// (title, goal, rows) differs per route.
export function BoardView({ data }: { data: BoardData }) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div dangerouslySetInnerHTML={{ __html: SHELL }} />
      <script dangerouslySetInnerHTML={{ __html: "window.__BOARD__=" + JSON.stringify(data) + ";\n" + CLIENT }} />
    </>
  );
}
