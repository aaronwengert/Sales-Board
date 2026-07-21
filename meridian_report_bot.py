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
    if resp.status_code >= 400:
        # MeridianLink usually returns a SOAP fault body explaining WHY.
        # Log it before raising so the real reason shows up in the run log.
        log.error("HTTP %s calling %s/%s. MeridianLink response (first 3000 chars):\n%s",
                  resp.status_code, service, method, resp.text[:3000])
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
    bh = cfg.get("business_hours")
    if not bh:
        return True
    now = datetime.now()
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
    args = ap.parse_args()

    cfg = load_config()

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
