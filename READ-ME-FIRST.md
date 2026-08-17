# Small follow-up — two files

Upload these two on top of what you already deployed:

    board/package.json      adds the @vercel/blob dependency
    board/lib/ooo.ts        uses Vercel's official SDK, and a PRIVATE store

Why: the first version talked to Blob over raw HTTP and assumed a public store.
Vercel supports private Blob stores, which is the right choice for this — the
file holds names and dates and there is no reason for it to be reachable by URL.
The SDK also removes any guesswork about request headers.

Nothing else changes. The screen, the board, and everything else stay as they are.

Upload these, then create the Blob store (below), then redeploy.

## Creating the Blob store

1. Vercel dashboard → your **Lien Kings** team → **Storage** tab.
2. **Create** → choose **Blob**.
3. Name it anything, e.g. `board-storage`. Choose **Private** access.
   Region: `iad1` (US East) is the default and is fine.
4. When asked which projects to connect it to, select **ae-leaderboard**.
   Connect it to all three environments (Production, Preview, Development).
5. Redeploy the project — or just push these files, which triggers one.

Vercel adds `BLOB_READ_WRITE_TOKEN` to the project's environment variables for
you. Do not create that variable by hand; connecting the store is what creates it.

## Confirming it worked

Open `/ooo` on the board. The yellow "No storage connected yet" banner should be
gone and the green button should be active. Mark someone out for today, then
reload the page — if they are still listed under "Out today", the write and the
read are both working.

Then open the board itself. Within five minutes that person shows OUT OF OFFICE
and the goal percentage denominator drops by one.

If the banner is still there after redeploying, the store is not connected to
this project — check Storage → your store → Projects.
