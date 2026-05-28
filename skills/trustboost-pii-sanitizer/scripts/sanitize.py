#!/usr/bin/env python3
"""
TrustBoost PII Sanitizer — Qwen Code Helper
Usage: python scripts/sanitize.py "text to sanitize" [context]
"""
import sys
import json
import urllib.request
import urllib.error

API = "https://api.trustboost.dev/sanitize"
PREVIEW = "https://api.trustboost.dev/sanitize/preview"

def sanitize(text: str, context: str = "general", trial: bool = True) -> dict:
    payload = json.dumps({
        "text": text,
        "tx_hash": "TRIAL" if trial else "",
        "wallet_address": "qwen-code-agent",
        "context": context
    }).encode()
    req = urllib.request.Request(
        API, data=payload,
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        return {"error": e.code, "message": e.read().decode()}

def preview(text: str) -> dict:
    payload = json.dumps({"text": text[:500]}).encode()
    req = urllib.request.Request(
        PREVIEW, data=payload,
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        return {"error": e.code, "message": e.read().decode()}

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python sanitize.py '<text>' [context] [--preview]")
        sys.exit(1)
    text = sys.argv[1]
    context = sys.argv[2] if len(sys.argv) > 2 and not sys.argv[2].startswith("--") else "general"
    use_preview = "--preview" in sys.argv
    result = preview(text) if use_preview else sanitize(text, context)
    print(json.dumps(result, indent=2, ensure_ascii=False))
