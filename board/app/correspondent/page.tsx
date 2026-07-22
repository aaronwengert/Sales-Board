import { getBoard } from "@/lib/fetch";
import { BoardView } from "@/lib/BoardView";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

export default async function Page() {
  return <BoardView data={await getBoard("correspondent")} />;
}
