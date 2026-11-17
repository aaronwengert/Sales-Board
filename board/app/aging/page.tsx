import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

// A memorable way in. The aging view is a TV2 screen, so it lives behind the
// same ?tv=2 switch as the others and is selected with ?screen= — which is a
// lot to remember and retype on a phone. This is the address you can actually
// say out loud; the screen itself is unchanged.
//
// It is deliberately a redirect rather than its own render: one definition of
// that screen, in tv2.ts, is the reason the numbers on it cannot drift from
// the numbers on the board.
export default function Page() {
  redirect("/?tv=2&screen=s3");
}
