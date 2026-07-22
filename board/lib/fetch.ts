import { google } from "googleapis";
import { computeBoard, BOARDS, type BoardData, type Channel } from "./board";

const POWERBI = process.env.POWERBI_FOLDER_ID || "1kNFwyV5Jn-JNtlKdXph2KoWFwwX_A5yk";
const CALLS = process.env.CALL_REPORTS_FOLDER_ID || "16al-d-n0hlYV_X84pj74ChMR-b-b5nYJ";

function hasCreds() { return Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY); }
function client() {
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/drive.readonly"],
  });
  return google.drive({ version: "v3", auth });
}

type DFile = { id: string; name: string; modifiedTime: string };

async function listCsvs(folderId: string): Promise<DFile[]> {
  const d = client();
  const res: any = await d.files.list({
    q: `'${folderId}' in parents and trashed = false and (mimeType = 'text/csv' or name contains '.csv')`,
    fields: "files(id,name,modifiedTime)",
    orderBy: "modifiedTime desc",
    pageSize: 25,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });
  return (res.data.files || []).map((f: any) => ({ id: f.id, name: f.name, modifiedTime: f.modifiedTime || "" }));
}
async function download(id: string): Promise<string> {
  const d = client();
  const res: any = await d.files.get({ fileId: id, alt: "media", supportsAllDrives: true }, { responseType: "text" });
  return typeof res.data === "string" ? res.data : String(res.data);
}

function azTimeLabel(iso: string): string {
  try {
    const t = new Date(iso).toLocaleTimeString("en-US", { timeZone: "America/Phoenix", hour: "numeric", minute: "2-digit" });
    return t + " MST";
  } catch { return "—"; }
}
function azDateStr(iso: string): string {
  return new Date(new Date(iso).toLocaleString("en-US", { timeZone: "America/Phoenix" })).toDateString();
}
function azTodayStr(): string {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "America/Phoenix" })).toDateString();
}

function emptyBoard(channel: Channel): BoardData {
  const cfg = BOARDS[channel];
  return {
    rows: [], today: {}, mtd: {}, callsPending: true,
    kpi: { pipeline: 0, pipeLocked: 0, pipeUnlocked: 0, lockedPct: 0, funded: 0, fundedUnits: 0, goalElig: 0, ctc: 0, ctcUnits: 0, fundedCtc: 0 },
    updatedLabel: "—",
    callsUpdatedLabel: "—",
    title: cfg.title, goal: cfg.goal, channel,
  };
}

export async function getBoard(channel: Channel = "wholesale"): Promise<BoardData> {
  const EMPTY = emptyBoard(channel);
  if (!hasCreds()) return { ...EMPTY, error: "no-credentials" };
  try {
    const [prodFiles, callFiles] = await Promise.all([listCsvs(POWERBI), listCsvs(CALLS)]);
    // Newest production CSV that actually contains the Sales Board header.
    let prodCsv = "", prodFile: DFile | null = null;
    for (const f of prodFiles) {
      const text = await download(f.id);
      if (text.includes("Lender Account Executive Name")) { prodCsv = text; prodFile = f; break; }
    }
    if (!prodFile) return { ...EMPTY, error: "no-production" };

    // Newest "Users Summary" call report.
    const callFile = callFiles.find((f) => /users summary/i.test(f.name)) || null;
    let callsCsv: string | null = null, callsIsToday = false;
    if (callFile) {
      callsCsv = await download(callFile.id);
      callsIsToday = azDateStr(callFile.modifiedTime) === azTodayStr();
    }
    const callsLabel = callFile ? azTimeLabel(callFile.modifiedTime) : "—";

    return computeBoard(prodCsv, callsCsv, callsIsToday, azTimeLabel(prodFile.modifiedTime), callsLabel, channel);
  } catch (e: any) {
    return { ...EMPTY, error: e?.message || String(e) };
  }
}
