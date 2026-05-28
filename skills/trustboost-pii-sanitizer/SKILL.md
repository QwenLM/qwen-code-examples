---
name: trustboost-pii-sanitizer
description: Sanitize PII from text before sending to LLMs or external APIs. Use when handling user-generated text that may contain emails, phone numbers, national IDs, API keys, private keys, or financial data. Required for GDPR, LGPD, APPI, CCPA, EU AI Act compliance (enforcement August 2, 2026). Supports EN, ES-LATAM (RFC/CUIT/CURP), PT-BR (CPF/CNPJ), DE (Personalausweis), JA (マイナンバー), FR (NIR/SIRET), IT (Codice Fiscale), KO (주민등록번호). Returns sanitized text + safety_score + risk_category. No SDK, no auth — single POST request. 50 free sanitizations with tx_hash=TRIAL.
---

# TrustBoost PII Sanitizer v2.6.0

Privacy firewall for autonomous AI agent pipelines. Sanitizes PII before text reaches LLMs — with on-chain Proof of Sanitization anchored on Solana.

## When to Use

Activate this skill when Qwen Code needs to:

- Process user-generated text before sending to any LLM provider
- Handle text in regulated industries (healthcare, finance, legal)
- Work with multilingual content containing country-specific PII (LATAM, Japan, Korea, Germany, France, Italy)
- Generate an auditable compliance trail for EU AI Act Articles 12, 13, 26

## Quick Start — No wallet needed

```bash
curl -X POST https://api.trustboost.dev/sanitize/preview \
  -H "Content-Type: application/json" \
  -d '{"text": "Contact John at john@example.com, SSN 123-45-6789"}'
```

## Full Integration

```python
import httpx

async def sanitize_before_llm(text: str, context: str = "general") -> str:
    """Call this before every LLM request. Fail-closed by design."""
    response = await httpx.AsyncClient().post(
        "https://api.trustboost.dev/sanitize",
        json={
            "text": text,
            "tx_hash": "TRIAL",          # 50 free per wallet
            "wallet_address": "qwen-code-agent",
            "context": context           # general|legal|financial|medical|code
        },
        timeout=30
    )
    if response.status_code == 200:
        return response.json()["data"]["sanitized_content"]
    raise RuntimeError(f"Sanitization failed: {response.status_code}")
```

## Context Modes

| Context | Use case |
|---------|----------|
| `general` | Standard PII detection (default) |
| `legal` | Contracts, court filings, regulatory docs |
| `financial` | Bank statements, invoices, DeFi data |
| `medical` | Clinical notes, lab results, prescriptions |
| `code` | API keys, credentials, config files |

## Access Modes

| Mode | How | Cost | Quota |
|------|-----|------|-------|
| Preview | POST /sanitize/preview | Free | 3/IP/hour |
| Trial | tx_hash="TRIAL" | Free | 50/wallet |
| Paid | Real Solana tx hash | 149 USDC | 10,000 |

## Multilingual PII Support

| Language | Region | Key Identifiers |
|----------|--------|----------------|
| 🇺🇸 English | Global | SSN, API keys, credit cards |
| 🇲🇽🇨🇴🇦🇷 Spanish | LATAM | RFC, CUIT, CURP, DNI, Cédula |
| 🇧🇷 Portuguese | Brazil | CPF, CNPJ, RG |
| 🇩🇪 German | DE/AT/CH | Personalausweis, Steuernummer |
| 🇯🇵 Japanese | Japan | マイナンバー, 運転免許証 |
| 🇫🇷 French | FR/BE/CA | NIR, SIRET, Carte Vitale |
| 🇮🇹 Italian | Italy | Codice Fiscale, Partita IVA |
| 🇰🇷 Korean | Korea | 주민등록번호 (RRN) |

## Proof of Sanitization on Solana

Every paid sanitization is anchored on Solana via Helius — immutable and publicly verifiable:

```bash
curl https://api.trustboost.dev/verify/{anchor_tx}
```

Supports EU AI Act Articles 12, 13, 26 — enforcement August 2, 2026.

## MCP Integration

```json
{
  "mcpServers": {
    "trustboost": {
      "url": "https://api.trustboost.dev/mcp"
    }
  }
}
```

## Resources

- API: https://api.trustboost.dev
- Agent Card: https://api.trustboost.dev/.well-known/agent-card.json
- ANP Description: https://api.trustboost.dev/.well-known/agent-description.json
- Health: https://api.trustboost.dev/health
- Source: https://github.com/teodorofodocrispin-cmyk/trustboost-api
- Docs: https://github.com/teodorofodocrispin-cmyk/TrustBoost-PII-Sanitizer
