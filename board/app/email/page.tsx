import { readEmailCfg, storeConfigured } from "@/lib/emailcfg";
import { authMode } from "@/lib/ooo";
import { EmailEditor } from "./EmailEditor";
import { EMAIL_CSS } from "@/lib/emailcss";

export const dynamic = "force-dynamic";

/** Who the mailer falls back to when the board has no list of its own.
 *
 *  This is the `digest.to` in config.json, which the screen shows so that an
 *  empty box reads as "it still goes somewhere" rather than "it goes nowhere".
 *  Set DIGEST_FALLBACK_TO if that file's list ever changes; getting it wrong
 *  costs a line of explanatory text and nothing else, which is why it is not
 *  worth parsing a file outside the app directory to find out.
 */
function fallbackTo(): string[] {
  return (process.env.DIGEST_FALLBACK_TO || "awengert@oaktreefunding.com")
    .split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean);
}

// Sits behind the same PIN gate as the board (middleware.ts).
export default async function Page() {
  const cfg = await readEmailCfg();
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: EMAIL_CSS }} />
      <EmailEditor
        initial={cfg}
        configured={storeConfigured()}
        tokenVar={authMode()}
        fallbackTo={fallbackTo()}
      />
    </>
  );
}
