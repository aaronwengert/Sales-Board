import { getBoard } from "@/lib/fetch";
import { CSS } from "@/lib/css";
import { SHELL } from "@/lib/shell";
import { CLIENT } from "@/lib/client";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

export default async function Page() {
  const data = await getBoard();
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div dangerouslySetInnerHTML={{ __html: SHELL }} />
      <script dangerouslySetInnerHTML={{ __html: "window.__BOARD__=" + JSON.stringify(data) + ";\n" + CLIENT }} />
    </>
  );
}
