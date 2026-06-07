# WorldSLA-NPU Migration Rules

## Attention contract

Preserve the model's public contract. Prefer replacing an internal attention callable over changing model input/output signatures.

Common q/k/v layouts:

- `[B, L, H, D]` for many video/world-model attention paths;
- `[B, H, L, D]` after explicit transpose wrappers;
- output shape should match the original attention output contract.

## Backend selection

| Goal | Strategy |
|---|---|
| dense-equivalence proof | exact-all routing |
| long-context performance | block-batched sparse routing |
| memory/OOM fallback | loop/reference implementation |
| variable shapes | auto-select with logged shape and memory estimate |

## Validation gates

Do not claim a successful migration until these gates pass in the target environment:

1. environment preflight;
2. attention scan report;
3. shape and finite forward check;
4. dense-vs-SLA relative error and cosine check in exact-all mode;
5. sparse forward/backward smoke;
6. public/synthetic fine-tuning or distillation curve if training is claimed;
7. HCCL/all_reduce and DP smoke if multi-card readiness is claimed;
8. report with command lines, logs, and limitations.
