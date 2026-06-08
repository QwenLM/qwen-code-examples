# WorldSLA-NPU Migration Rules

## Core principle

SLA is a **candidate optimization backend**, not a guaranteed replacement for dense attention. A candidate is accepted only after gate-based validation on the target attention shape and task signal.

## Gate 1: attention contract and semantics

Preserve the target model public contract. Prefer replacing an internal local-attention callable instead of changing model input/output shapes.

Common accepted layouts:

- `[B, L, H, D]` for q/k/v and output;
- `[B, H, L, D]` only after explicit transpose wrapper;
- output shape must equal the original attention output contract.

Inspect these semantics before generating a candidate:

- causal mask or local-window mask;
- relative position bias or RoPE;
- KV cache and autoregressive decoding;
- cross-attention vs self-attention;
- temporal-spatial masks;
- action/state conditioning in world models.

If semantics cannot be preserved by an adapter, return `REJECT` or keep that layer dense.

## Backend selection

| Goal | Backend | Rule |
|---|---|---|
| interface proof | exact-all | all key blocks are selected; compare against dense |
| long-context performance | block_batched | use when temporary memory fits |
| OOM/correctness fallback | loop | slower but lower temporary memory |
| variable shapes | auto | estimate memory and log backend decision |
| sensitive layers | dense/exact-all | use when sparse quality fails |

## Validation gates

A migration is not complete until all available gates are recorded:

1. environment preflight;
2. attention interface and semantics scan;
3. exact-all dense-vs-SLA correctness;
4. sparse topk quality/rollout validation;
5. backward/training smoke;
6. latency, peak memory, and OOM/fallback boundary;
7. HCCL/DP smoke if multi-card readiness is claimed;
8. generated report with `PASS`, `NEEDS_TARGET_VALIDATION`, `NEEDS_TUNING`, `FALLBACK`, or `REJECT`.

## Private-code protection

Do not export private model files. For closed-source targets, report only symbols, shapes, hashes, commands, and aggregate metrics.
