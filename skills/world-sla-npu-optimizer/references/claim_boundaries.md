# Claim Boundaries

Allowed claims:

- This is a Qwen Code Agent Skill package for gate-based SLA migration validation.
- It can scan attention interfaces, generate candidate adapter-level migration plans, run validation gates, and produce pass/fallback/tuning reports.
- It has measured Ascend NPU evidence for selected public examples and shapes, when those logs are attached.
- Exact-all correctness only proves interface/layout compatibility; sparse topk quality must be validated separately.

Do not claim unless new evidence is added:

- arbitrary world-model attention can be safely replaced by SLA;
- sparse SLA is always more accurate or faster than dense attention;
- modifying Qwen model internals;
- 8-card scaling;
- tensor/pipeline parallel or FSDP/HSDP full training;
- full Megatron/MindSpeed training;
- fused Ascend custom kernel speedup;
- private or closed-source project code contribution.
