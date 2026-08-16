import { readEntries, azToday, storeConfigured } from "@/lib/ooo";
import { rosterByTeam } from "@/lib/board";
import { OooEditor } from "./OooEditor";
import { OOO_CSS } from "@/lib/ooocss";

export const dynamic = "force-dynamic";

// Sits behind the same PIN gate as the board (middleware.ts). Phone-first: this
// gets used at 6:40am from a parking lot far more often than from a desk.
export default async function Page() {
  const [entries, groups] = [await readEntries(), rosterByTeam("wholesale")];
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: OOO_CSS }} />
      <OooEditor initial={entries} groups={groups} today={azToday()} configured={storeConfigured()} />
    </>
  );
}
