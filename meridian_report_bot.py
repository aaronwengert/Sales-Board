#!/usr/bin/env python3
"""
meridian_report_bot.py — Pull custom reports from MeridianLink Mortgage
(formerly LendingQB) via its SOAP web services and email them on a schedule.

Uses the official web services — no browser automation needed:
  AuthService.asmx  GetUserAuthTicket(userName, passWord)      -> ticket
  Reporting.asmx    RetrieveCustomReport(ticket, reportName,
                                         includeAllWithAccess) -> CSV string

The reports must already exist as saved Custom Reports in MeridianLink
(Reports -> Custom Reports). sQueryNm is the exact saved report name.

Setup:
    pip install requests

Usage:
    python meridian_report_bot.py               # normal run
    python meridian_report_bot.py --dry-run     # fetch reports, don't email
    python meridian_report_bot.py --test-email  # verify SMTP settings only
    python meridian_report_bot.py --force       # ignore business-hours window
"""

import argparse
import json
import logging
import os
import smtplib
import sys
import xml.etree.ElementTree as ET
from datetime import datetime
from email.message import EmailMessage
from pathlib import Path
from zoneinfo import ZoneInfo

import requests

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
BASE_URL = "https://secure.mortgage.meridianlink.com/los/webservice"
NS = "http://www.lendersoffice.com/los/webservices/"
SOAP_ENV = "http://schemas.xmlsoap.org/soap/envelope/"

BASE_DIR = Path(__file__).resolve().parent
DOWNLOAD_DIR = BASE_DIR / "downloads"
LOG_FILE = BASE_DIR / "report_bot.log"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-7s %(message)s",
    handlers=[logging.FileHandler(LOG_FILE, encoding="utf-8"),
              logging.StreamHandler(sys.stdout)],
)
log = logging.getLogger("meridian_report_bot")


# ---------------------------------------------------------------------------
# SOAP plumbing
# ---------------------------------------------------------------------------
def soap_call(service: str, method: str, params: dict, timeout: int = 120) -> str:
    """POST a SOAP 1.1 request and return the <MethodResult> text."""
    body_params = "".join(
        f"<{k}>{_xml_escape(str(v))}</{k}>" for k, v in params.items()
    )
    envelope = (
        '<?xml version="1.0" encoding="utf-8"?>'
        f'<soap:Envelope xmlns:soap="{SOAP_ENV}">'
        "<soap:Body>"
        f'<{method} xmlns="{NS}">{body_params}</{method}>'
        "</soap:Body></soap:Envelope>"
    )
    resp = requests.post(
        f"{BASE_URL}/{service}",
        data=envelope.encode("utf-8"),
        headers={
            "Content-Type": "text/xml; charset=utf-8",
            "SOAPAction": f'"{NS}{method}"',
        },
        timeout=timeout,
    )
    resp.raise_for_status()

    root = ET.fromstring(resp.content)
    result = root.find(f".//{{{NS}}}{method}Result")
    if result is None or result.text is None:
        raise RuntimeError(
            f"{method}: empty or unexpected response:\n{resp.text[:2000]}")
    return result.text


def _xml_escape(s: str) -> str:
    return (s.replace("&", "&amp;").replace("<", "&lt;")
             .replace(">", "&gt;").replace('"', "&quot;"))


def get_ticket(cfg: dict) -> str:
    p = cfg["platform"]
    log.info("Authenticating as %s ...", p["username"])
    ticket = soap_call("AuthService.asmx", "GetUserAuthTicket", {
        "userName": p["username"],
        "passWord": p["password"],
    })
    # Auth errors come back as a result string rather than a SOAP fault.
    if not ticket or "invalid" in ticket.lower() or "error" in ticket.lower():
        raise RuntimeError(f"Authentication failed: {ticket!r}")
    log.info("Got auth ticket.")
    return ticket


def fetch_reports(cfg: dict) -> list[Path]:
    """Retrieve every configured custom report as a CSV file."""
    ticket = get_ticket(cfg)
    DOWNLOAD_DIR.mkdir(exist_ok=True)
    stamp = datetime.now().strftime("%Y-%m-%d_%H%M")
    files: list[Path] = []

    for report in cfg["platform"]["reports"]:
        name = report["name"]
        log.info("Retrieving custom report: %s", name)
        try:
            csv_text = soap_call("Reporting.asmx", "RetrieveCustomReport", {
                "sTicket": ticket,
                "sQueryNm": name,
                "includeAllWithAccess": str(
                    report.get("include_all_with_access", True)).lower(),
            })
        except Exception:
            log.exception("Failed to retrieve report '%s'.", name)
            continue

        if csv_text.lstrip().startswith("<") and "error" in csv_text.lower():
            log.error("Report '%s' returned an error payload:\n%s",
                      name, csv_text[:1000])
            continue

        safe = "".join(c if c.isalnum() or c in "-_ " else "_" for c in name)
        dest = DOWNLOAD_DIR / f"{safe}_{stamp}.csv"
        dest.write_text(csv_text, encoding="utf-8")
        rows = max(csv_text.count("\n") - 1, 0)
        log.info("Saved %s (~%d data rows).", dest.name, rows)
        files.append(dest)

    return files


# ---------------------------------------------------------------------------
# Business-hours guard
# ---------------------------------------------------------------------------
def within_business_hours(cfg: dict) -> bool:
    """Timezone-aware guard.

    IMPORTANT: uses the timezone named in config (default America/Phoenix),
    NOT the server's local clock — cloud runners like GitHub Actions run in
    UTC, which would otherwise shift the window by 7 hours.
    """
    bh = cfg.get("business_hours")
    if not bh:
        return True
    tz = ZoneInfo(bh.get("timezone", "America/Phoenix"))
    now = datetime.now(tz)
    if now.weekday() not in bh.get("weekdays", [0, 1, 2, 3, 4]):
        return False
    start = datetime.strptime(bh["start"], "%H:%M").time()
    end = datetime.strptime(bh["end"], "%H:%M").time()
    return start <= now.time() <= end


# ---------------------------------------------------------------------------
# Email
# ---------------------------------------------------------------------------
def send_email(cfg: dict, attachments: list[Path]) -> None:
    e = cfg["email"]
    now = datetime.now().strftime("%b %d, %Y %I:%M %p")

    msg = EmailMessage()
    msg["From"] = e["from"]
    msg["To"] = ", ".join(e["to"])
    msg["Subject"] = e["subject_template"].format(timestamp=now)
    body = e.get("body_template",
                 "Attached: MeridianLink reports generated {timestamp}.")
    msg.set_content(body.format(timestamp=now))

    for path in attachments:
        msg.add_attachment(path.read_bytes(), maintype="text", subtype="csv",
                           filename=path.name)

    with smtplib.SMTP(e["smtp_host"], e.get("smtp_port", 587)) as s:
        s.starttls()
        s.login(e["smtp_user"], e["smtp_password"])
        s.send_message(msg)
    log.info("Emailed %d attachment(s) to %s", len(attachments), msg["To"])


# ---------------------------------------------------------------------------
# Daily-goal digest
#
# The board renders the email; this script only delivers it. /api/digest returns
# {subject, preheader, html, dials[], skip}, where the HTML already points each
# dial at cid:dial-KEY. We draw those four donuts here and attach them inline,
# because an inline part displays even when the client blocks remote images.
# Nothing about the numbers is recomputed here — if this disagreed with the
# board, the board would be right.
# ---------------------------------------------------------------------------
DIAL_PX = 224            # 2x the 112px the email displays them at
DIAL_RING = 27           # stroke width
DIAL_PAD = 12            # margin from the edge of the square


def _hex(c: str):
    c = c.lstrip("#")
    return tuple(int(c[i:i + 2], 16) for i in (0, 2, 4))


def draw_dial(d: dict) -> bytes:
    """One donut as PNG bytes: arc over a lighter track, number and unit inside.

    Drawn at 4x and downsampled, which is the cheapest way to get a clean edge
    out of Pillow — it has no antialiased arc.
    """
    from io import BytesIO
    from PIL import Image, ImageDraw, ImageFont

    S, ss = DIAL_PX, 4
    img = Image.new("RGB", (S * ss, S * ss), d.get("bg") or "#ffffff")
    dr = ImageDraw.Draw(img)
    box = [DIAL_PAD * ss, DIAL_PAD * ss, (S - DIAL_PAD) * ss, (S - DIAL_PAD) * ss]
    w = DIAL_RING * ss

    dr.arc(box, 0, 360, fill=_hex(d["track"]), width=w)
    pct = max(0, min(100, int(d.get("pct") or 0)))
    if pct > 0:
        # -90 puts twelve o'clock at the start, the way a dial is read.
        dr.arc(box, -90, -90 + 360 * pct / 100.0, fill=_hex(d["color"]), width=w)

    def font(size):
        for path in ("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
                     "/Library/Fonts/Arial Bold.ttf",
                     "/System/Library/Fonts/Supplemental/Arial Bold.ttf"):
            try:
                return ImageFont.truetype(path, size)
            except OSError:
                continue
        return ImageFont.load_default()

    num = "\u2013" if d.get("pending") else str(d["value"])
    ink = _hex("#b6bfcb") if d.get("pending") else _hex(d["color"])
    f1, f2 = font(58 * ss), font(19 * ss)
    cx = S * ss / 2
    dr.text((cx, cx - 14 * ss), num, font=f1, fill=ink, anchor="mm")
    dr.text((cx, cx + 26 * ss), d.get("unit") or "", font=f2, fill=_hex("#8a94a4"), anchor="mm")

    out = BytesIO()
    img.resize((S, S), Image.LANCZOS).save(out, "PNG")
    return out.getvalue()


def parse_recipients(raw) -> list[str]:
    """Split however the addresses were given.

    A test send is typed by hand under time pressure, so every plausible
    separator is accepted rather than only the one documented somewhere.
    """
    import re
    if not raw:
        return []
    parts = raw if isinstance(raw, list) else [raw]
    out: list[str] = []
    for p in parts:
        out.extend(x for x in re.split(r"[,;\s]+", str(p).strip()) if x)
    seen, uniq = set(), []
    for a in out:
        if a.lower() not in seen:
            seen.add(a.lower())
            uniq.append(a)
    return uniq


def fetch_digest(cfg: dict) -> dict:
    d = cfg["digest"]
    key = os.environ.get("REPORT_KEY", d.get("key", ""))
    if not key:
        log.error("REPORT_KEY is not set; /api/digest will refuse the request.")
        sys.exit(1)
    url = d["url"].rstrip("/") + "/api/digest"
    r = requests.get(url, params={"format": "json", "key": key,
                                  "channel": d.get("channel", "wholesale")},
                     timeout=60)
    r.raise_for_status()
    return r.json()


def send_digest(cfg: dict, payload: dict, to: list[str] | None = None,
                subject_prefix: str = "") -> None:
    e, d = cfg["email"], cfg["digest"]
    recipients = to or d.get("to") or e["to"]

    msg = EmailMessage()
    msg["From"] = d.get("from", e["from"])
    msg["To"] = ", ".join(recipients)
    msg["Subject"] = subject_prefix + payload["subject"]
    # A text part is not decoration: a client that refuses HTML still gets the
    # headline, and spam filters treat a multipart/alternative better than a
    # lone HTML body.
    msg.set_content(payload.get("preheader") or "Daily goal update.")
    msg.add_alternative(payload["html"], subtype="html")
    html_part = msg.get_payload()[-1]

    for dial in payload.get("dials", []):
        try:
            png = draw_dial(dial)
        except Exception as exc:                       # noqa: BLE001
            # The email falls back to a drawn ring when an image is missing, so
            # a font or Pillow problem costs decoration, not the send.
            log.warning("dial %s not drawn (%s); sending without it", dial.get("key"), exc)
            continue
        html_part.add_related(png, maintype="image", subtype="png",
                              cid="<%s>" % dial["cid"], filename=dial["cid"] + ".png")

    with smtplib.SMTP(e["smtp_host"], e.get("smtp_port", 587)) as s:
        s.starttls()
        s.login(e["smtp_user"], e["smtp_password"])
        s.send_message(msg)
    log.info("Digest emailed to %s (%s)", msg["To"], payload["subject"])


# ---------------------------------------------------------------------------
# Config / main
# ---------------------------------------------------------------------------
def load_config() -> dict:
    cfg_path = BASE_DIR / "config.json"
    if not cfg_path.exists():
        log.error("config.json not found. Copy config.example.json and fill it in.")
        sys.exit(1)
    cfg = json.loads(cfg_path.read_text(encoding="utf-8"))
    cfg["platform"]["password"] = os.environ.get(
        "MERIDIAN_PASSWORD", cfg["platform"].get("password", ""))
    cfg["email"]["smtp_password"] = os.environ.get(
        "SMTP_PASSWORD", cfg["email"].get("smtp_password", ""))
    return cfg


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--dry-run", action="store_true", help="skip sending the email")
    ap.add_argument("--test-email", action="store_true", help="send test email only")
    ap.add_argument("--force", action="store_true", help="ignore business-hours window")
    ap.add_argument("--digest", action="store_true",
                    help="send the daily-goal digest instead of the CSV export")
    ap.add_argument("--to", action="append", default=None,
                    help="override the digest recipients (repeatable, or one comma-separated "
                         "list); implies a test send. DIGEST_TO does the same from the environment")
    args = ap.parse_args()

    cfg = load_config()

    # The digest runs on its own schedule and has its own weekend rule, which
    # the board decides (it knows the Arizona calendar). It does not share the
    # hourly export's business-hours window.
    if args.digest:
        try:
            payload = fetch_digest(cfg)
        except Exception:
            log.exception("Digest fetch failed.")
            return 1
        if payload.get("skip") and not args.force and not to:
            log.info("Digest skipped (%s).", payload.get("reason") or "board said so")
            return 0
        to = parse_recipients(args.to) or parse_recipients(os.environ.get("DIGEST_TO"))
        if args.dry_run:
            out = BASE_DIR / "digest_preview.html"
            out.write_text(payload["html"], encoding="utf-8")
            log.info("Dry run: wrote %s (%s)", out, payload["subject"])
            return 0
        try:
            if to:
                log.info("Test send to %d recipient(s): %s", len(to), ", ".join(to))
            send_digest(cfg, payload, to=to or None,
                        subject_prefix="[TEST] " if to else "")
        except Exception:
            log.exception("Digest send failed.")
            return 1
        return 0

    if not args.force and not within_business_hours(cfg):
        log.info("Outside business hours — nothing to do.")
        return 0

    if args.test_email:
        send_email(cfg, [])
        return 0

    try:
        files = fetch_reports(cfg)
    except Exception:
        log.exception("Report fetch failed.")
        return 1

    if not files:
        log.error("No reports retrieved — see report_bot.log.")
        return 1

    if args.dry_run:
        log.info("Dry run: skipping email. Files: %s", [f.name for f in files])
        return 0

    try:
        send_email(cfg, files)
    except Exception:
        log.exception("Email send failed.")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
