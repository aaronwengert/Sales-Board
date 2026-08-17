# Fix: your Blob store uses OIDC, not a read-write token

Upload these four files and redeploy. No Vercel changes needed — your store is
already connected correctly.

    board/lib/ooo.ts             authenticates via OIDC or a static token
    board/lib/ooocss.ts          styling for the status line
    board/app/ooo/page.tsx       passes the auth mode through
    board/app/ooo/OooEditor.tsx  clearer banner + confirms which mode is in use

## What was actually wrong

Vercel connects Blob stores two different ways:

  1. Static token — sets BLOB_READ_WRITE_TOKEN
  2. OIDC — sets BLOB_STORE_ID, and injects a short-lived VERCEL_OIDC_TOKEN at
     runtime on every function invocation

Your store used the second one. That is why you see BLOB_STORE_ID and
BLOB_WEBHOOK_PUBLIC_KEY in the environment variables list but no read-write
token — the OIDC token rotates, so it deliberately never appears in that list.

My code only looked for a read-write token, so it concluded there was no storage
even though the store was wired up properly. Nothing on your side was wrong.

It now accepts either mechanism: a static token if one exists (including
prefixed names like SALES_BOARD_OOO_BLOB_READ_WRITE_TOKEN), otherwise the store
id, letting the SDK use the OIDC token it already has.

## After deploying

Open /ooo. The yellow banner should be gone, and a small green line should read
"Storage connected via OIDC + BLOB_STORE_ID". Mark someone out for today, reload
the page, and confirm they are still listed — that proves the write and the read.
