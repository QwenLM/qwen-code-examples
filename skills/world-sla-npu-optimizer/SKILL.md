---
name: world-sla-npu-optimizer
description: Qwen Code Agent Skill for gate-based migration validation of world-model, video-diffusion, or long-context attention modules with Sparse Linear Attention on Ascend NPU. Use when users ask to scan attention code, judge whether dense/local attention is suitable for SLA, create an adapter-level SLA candidate, run torch_npu/CANN/HCCL preflight, perform exact-all correctness, sparse-quality, backward/training, performance/memory, and multi-card gates, or generate pass/fallback/tuning migration reports.
---

# WorldSLA-NPU Optimizer

## Purpose

Use this Skill to evaluate whether a target world-model/video-diffusion attention module is a safe and useful candidate for Sparse Linear Attention (SLA) on Ascend NPU. This Skill does **not** assume that replacing attention with SLA is automatically correct or faster.

Treat Qwen/千问 as the Agent that loads this Skill, follows the gate-based workflow, calls the bundled scripts, and outputs one of:

- `ACCEPT_WITH_BOUNDARIES`: gates pass for the measured shape/backend; claims are limited to that scope.
- `NEEDS_TARGET_VALIDATION`: a candidate exists, but target-specific correctness/performance/training gates are missing.
- `NEEDS_TUNING`: sparse quality or performance needs topk/block-size/layer-selection tuning.
- `FALLBACK`: use exact-all, dense, or loop backend for sensitive layers or OOM cases.
- `REJECT`: no compatible attention interface or semantics are found.

This Skill does not modify Qwen model internals. It is a reusable Agent Skill created for Qwen Code workflows: Qwen reads `SKILL.md`, uses the scripts/references here, edits target model code when appropriate, and validates the candidate on Ascend NPU.

## Gate-based workflow

1. **Gate 0: Environment**
   - Run `python scripts/skill_cli.py preflight --out preflight.json`.
   - Verify Python, torch, torch_npu, CANN visibility, NPU count, and bf16 matmul when available.
   - If no NPU is visible, mark the run as replay/demo only. Do not claim new hardware results.

2. **Gate 1: Attention interface and semantics**
   - Run `python scripts/skill_cli.py scan --repo <repo> --out scan.json`.
   - Look for `WanSelfAttention`, `SparseLinearAttention`, `SageSparseLinearAttention`, `attn_op.local_attn`, `local_attn`, `replace_attention`, or equivalent q/k/v modules.
   - Inspect whether the target uses causal masks, local windows, relative position bias, RoPE, KV cache, cross-attention, temporal-spatial masks, or action/state conditioning. These may require adapter logic or rejection.
   - Prefer adapter-level replacement over changing the model’s public I/O contract.

3. **Gate 2: Exact-all correctness**
   - Before sparse routing, run exact-all SLA against dense attention on the same target q/k/v shape.
   - Require shape equality, finite output, acceptable relative error, and high cosine similarity.
   - Passing this gate only proves interface/layout plausibility; it does not prove sparse quality.

4. **Gate 3: Sparse quality**
   - Run topk/block-size sweeps on a task-relevant validation signal.
   - If sparse quality fails, recommend increasing topk, keeping sensitive layers dense/exact-all, replacing only late blocks, or falling back.

5. **Gate 4: Backward/training**
   - Run backward smoke before claiming fine-tuning support.
   - For training claims, run a small public or synthetic distillation/fine-tuning curve.
   - Recommend warmup/distillation when sparse mode changes loss behavior.

6. **Gate 5: Performance/memory**
   - Benchmark dense, loop reference, block-batched, sparse, and auto backends on the target shape.
   - Report latency, peak memory, OOM/fallback boundaries, dtype, head count, head dim, topk, and block size.
   - Do not claim speedup unless measured on the target hardware and shape.

7. **Gate 6: Multi-card (optional)**
   - First run HCCL/all_reduce smoke.
   - Then run DP backward smoke if multi-card training is claimed.
   - Do not claim TP/PP/FSDP/HSDP or full Megatron/MindSpeed training unless those exact tests were run.

8. **Decision and report**
   - Run `python scripts/skill_cli.py plan --scan scan.json --out migration_plan.json` to generate a candidate plan. Then run `python scripts/skill_cli.py assess --preflight preflight.json --scan scan.json --plan migration_plan.json --metrics metrics.json --out gate_decision.json`.
   - Run `python scripts/skill_cli.py report ...` to generate a report.
   - The report must include PASS/NEEDS_TUNING/FALLBACK/REJECT decisions and recommendations.

## Bundled resources

- `scripts/skill_cli.py`: unified CLI for preflight, scan, candidate planning, gate assessment, local demo, and report generation.
- `references/migration_rules.md`: attention replacement, gate criteria, and backend selection rules.
- `references/ascend_npu_notes.md`: Ascend NPU preflight and measurement notes.
- `references/claim_boundaries.md`: what this Skill may and may not claim.
- `templates/report_template.md`: gate-based report structure.

## Output standards

Always report target path, attention symbols found, environment, q/k/v shape and dtype, backend selected, gate statuses, correctness metrics, sparse-quality/training evidence, latency/memory metrics, limitations, and next-step recommendations.

Never include passwords, SSH commands with credentials, private source code, or non-public model snippets in generated reports.
