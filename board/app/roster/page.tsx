import { readTitles, storeConfigured } from "@/lib/titles";
import { authMode } from "@/lib/ooo";
import { rosterByTeam, TEAM_MANAGERS } from "@/lib/board";
import { RosterEditor } from "./RosterEditor";
import { ROSTER_CSS } from "@/lib/rostercss";

export const dynamic = "force-dynamic";

/** Every roster the board draws, in the order the screen should show them.
 *
 *  All three channels, not just wholesale: a save replaces the whole document,
 *  so a screen that listed only wholesale would silently wipe a retail name
 *  the next time anyone pressed Save.
 *
 *  Sales managers are left out. They carry a book but no longer take a row on
 *  the board, so giving one a rank would save a name that never renders — a
 *  setting that appears to do nothing is worse than one that isn't offered.
 */
function rosterGroups() {
  const managers = new Set(Object.values(TEAM_MANAGERS).map((m) => m.toLowerCase()));
  return (["wholesale", "retail", "correspondent"] as const)
    .flatMap((ch) => rosterByTeam(ch))
    .map((g) => ({ team: g.team, aes: g.aes.filter((n) => !managers.has(n.toLowerCase())) }))
    .filter((g) => g.aes.length);
}

// Sits behind the same PIN gate as the board (middleware.ts).
export default async function Page() {
  const doc = await readTitles();
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: ROSTER_CSS }} />
      <RosterEditor
        initial={doc.titles}
        groups={rosterGroups()}
        configured={storeConfigured()}
        tokenVar={authMode()}
        savedBy={doc.by}
        savedAt={doc.at}
      />
    </>
  );
}
