# TrustBoost PII Sanitizer — Technical Reference

## API Response Structure

```json
{
  "status": "success",
  "data": {
    "sanitized_content": "Text with [REDACTED] tags",
    "safety_score": 0.95,
    "risk_category": "PRIVATE",
    "entities_removed": true,
    "entities": [
      {"type": "email", "category": "PRIVATE", "redacted_text": "john@example.com"},
      {"type": "ssn", "category": "PRIVATE", "redacted_text": "123-45-6789"}
    ],
    "context_applied": "general",
    "proof_of_sanitization": {
      "solana_tx": "tx_hash",
      "verify_url": "https://solscan.io/tx/tx_hash"
    },
    "usage_metrics": {
      "quota_remaining": 49,
      "quota_limit": 50
    }
  }
}
```

## Risk Categories

| Category | Score | Examples |
|----------|-------|---------|
| CRITICAL | 0.85–1.0 | API keys, private keys, passwords, credit cards |
| PRIVATE | 0.50–0.84 | Emails, phone numbers, national IDs, addresses |
| SENSITIVE | 0.10–0.49 | Social handles, general locations |
| CLEAN | 0.0 | No PII detected |

## Fail-Closed Policy

If TrustBoost is unreachable, BLOCK the LLM call. Never pass unsanitized text as fallback.

```python
try:
    sanitized = await sanitize_before_llm(text)
except RuntimeError:
    return {"error": "Request blocked — sanitization required"}
```

## EU AI Act Compliance

- **Art. 12** — Record keeping: Proof of Sanitization anchored on Solana
- **Art. 13** — Transparency: entities[] returned per request
- **Art. 26** — Deployer obligations: Privacy Budget per agent configurable
- **Enforcement date: August 2, 2026**

## Performance Benchmarks

| Metric | Result |
|--------|--------|
| Precision | 1.000 |
| Recall | 1.000 |
| F1 Score | 1.000 |
| False Positive Rate | 0.000 |
| Test cases | 34 (8 languages) |
| Avg latency | ~200ms |

## Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| /sanitize | POST | Main endpoint — full features |
| /sanitize/preview | POST | Free preview — 3/IP/hour |
| /redact | POST | Alias for /sanitize |
| /demo | POST | Alias for /sanitize/preview |
| /score/{wallet} | GET | M2M TrustBoost Score |
| /verify/{anchor_tx} | GET | Verify Proof on Solana |
| /budget/{operator} | GET | Privacy Budget status |
| /mcp | POST | MCP JSON-RPC 2.0 |
| /health | GET | Service health |
| /llms.txt | GET | LLM discovery |
