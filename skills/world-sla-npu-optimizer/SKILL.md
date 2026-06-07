---
name: world-sla-npu-optimizer
description: Qwen Code Agent Skill for migrating and validating world-model, video-diffusion, or other long-context attention modules with Sparse Linear Attention on Ascend NPU. Use when users ask to scan attention code, replace dense or local attention with SLA, validate torch_npu/CANN/HCCL environments, run dense-vs-SLA correctness/backward/performance checks, adapt MindSpeed-style local_attn modules, or generate an NPU migration report.
---

# WorldSLA-NPU Optimizer

## Overview

This skill helps Qwen Code turn a user request such as “migrate my world-model attention to Sparse Linear Attention on Ascend NPU” into a reproducible engineering workflow: environment preflight, attention interface scan, migration planning, validation gates, and report generation.

This skill does not modify Qwen model internals. It provides procedural knowledge and helper scripts for Qwen Code to assist with model-code migration tasks.

## Workflow

1. **Clarify the target**
   - Identify whether the target is a world model, video diffusion model, robotics policy, or another long-context model.
   - Look for attention entry points such as `WanSelfAttention`, `SparseLinearAttention`, `SageSparseLinearAttention`, `attn_op.local_attn`, `local_attn`, `replace_attention`, or equivalent q/k/v attention modules.
   - Preserve the target model's public input/output contract; prefer adapter-level replacement over changing model signatures.

2. **Run environment preflight**
   - From this skill directory, run:
     ```bash
     python scripts/skill_cli.py preflight --out preflight.json
     ```
   - Verify Python, torch, torch_npu, NPU visibility, and device count.
   - For multi-card claims, require a separate HCCL/all_reduce smoke test in the target environment before claiming distributed readiness.

3. **Scan attention interfaces**
   - Run:
     ```bash
     python scripts/skill_cli.py scan --repo /path/to/model/repo --out scan.json
     ```
   - Inspect file paths, line numbers, and matching symbols.
   - If the repository is private, summarize only symbols, shapes, hashes, and aggregate metrics; do not export private code.

4. **Select an SLA backend strategy**
   - Use exact-all routing first for dense-equivalence validation.
   - Use block-batched sparse routing for long-context performance experiments when temporary memory fits.
   - Use a loop/reference fallback for OOM debugging or correctness isolation.
   - Record q/k/v layout, dtype, sequence length, number of heads, head dimension, block size, top-k, and selected backend.

5. **Validate before claiming success**
   - Forward shape and finite checks.
   - Dense-vs-SLA relative error and cosine similarity in exact-all mode.
   - Sparse forward/backward smoke.
   - Public or synthetic fine-tuning/distillation curve if training support is claimed.
   - Latency and peak-memory measurements on the actual target hardware.
   - HCCL/all_reduce and data-parallel smoke before multi-card claims.

6. **Generate a report**
   - Run:
     ```bash
     python scripts/skill_cli.py report --scan scan.json --preflight preflight.json --out migration_report.md
     ```
   - Include results, command lines, log paths, limitations, and next steps.
   - Do not claim fused kernels, 8-card scaling, TP/PP/FSDP/HSDP, or full Megatron/MindSpeed training unless those exact experiments were run.

## Helper files

- `scripts/skill_cli.py`: preflight, scanner, report, and demo helper.
- `scripts/preflight_npu.py`: preflight wrapper.
- `scripts/scan_attention.py`: scanner wrapper.
- `scripts/generate_report.py`: report wrapper.
- `references/migration_rules.md`: attention migration and backend selection rules.
- `references/ascend_npu_notes.md`: Ascend NPU validation notes.
- `references/claim_boundaries.md`: safe claim boundaries.
- `templates/report_template.md`: report structure.
- `examples/sample_attention_module.py`: public toy file for scanner demos.

## Quick demo

From this skill directory:

```bash
python scripts/skill_cli.py demo --workspace .
```

The demo runs without an Ascend NPU. It performs a local preflight, scans the public sample attention file, and generates a sample report under `demo_outputs/`.
