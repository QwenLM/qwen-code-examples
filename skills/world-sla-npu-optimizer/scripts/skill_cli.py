#!/usr/bin/env python3
"""WorldSLA-NPU Qwen Code skill helper CLI.

Gate-based helper for evaluating whether a target attention module is a suitable
candidate for Sparse Linear Attention (SLA) on Ascend NPU. It does not assume that
replacing attention with SLA is automatically correct or faster.
"""
from __future__ import annotations
import argparse
import json
import os
import platform
import sys
import time
from pathlib import Path
from typing import Any, Dict, List, Tuple

PATTERNS = [
    "WanSelfAttention",
    "SparseLinearAttention",
    "SageSparseLinearAttention",
    "attn_op.local_attn",
    "local_attn",
    "replace_attention",
    "flash_attn",
    "triton",
    "qkv",
]

FEATURE_PATTERNS: Dict[str, Dict[str, Any]] = {
    "causal_mask": {"tokens": ["causal", "is_causal", "causal_mask", "tril("], "risk": "HIGH"},
    "local_window": {"tokens": ["window_size", "local_window", "sliding_window", "window_attn"], "risk": "MEDIUM"},
    "rope": {"tokens": ["rope", "rotary", "apply_rotary", "rotary_emb"], "risk": "MEDIUM"},
    "relative_position_bias": {"tokens": ["relative_position", "rel_pos", "position_bias", "relative_bias"], "risk": "MEDIUM"},
    "kv_cache": {"tokens": ["kv_cache", "past_key_value", "past_kv", "cache_k", "cache_v"], "risk": "HIGH"},
    "cross_attention": {"tokens": ["cross_attn", "cross_attention", "encoder_hidden_states", "context_k", "context_v"], "risk": "HIGH"},
    "temporal_spatial_mask": {"tokens": ["temporal", "spatial", "time_mask", "frame_mask", "video_mask"], "risk": "MEDIUM"},
    "action_state_conditioning": {"tokens": ["action", "state", "proprio", "condition", "conditioning"], "risk": "MEDIUM"},
}


def write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def cmd_preflight(args: argparse.Namespace) -> Dict[str, Any]:
    result: Dict[str, Any] = {
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "python": sys.version.split()[0],
        "platform": platform.platform(),
        "cwd": ".",
        "torch": None,
        "torch_npu": None,
        "npu_available": False,
        "npu_count": 0,
        "notes": [],
    }
    try:
        import torch  # type: ignore
        result["torch"] = getattr(torch, "__version__", "unknown")
        try:
            import torch_npu  # type: ignore  # noqa: F401
            result["torch_npu"] = getattr(torch_npu, "__version__", "unknown")
            if hasattr(torch, "npu"):
                result["npu_available"] = bool(torch.npu.is_available())
                result["npu_count"] = int(torch.npu.device_count()) if result["npu_available"] else 0
            if args.quick_matmul and result["npu_available"]:
                x = torch.randn(128, 128, device="npu:0", dtype=torch.bfloat16)
                y = x @ x.T
                torch.npu.synchronize()
                result["bf16_matmul_ok"] = bool(torch.isfinite(y.float()).all().item())
        except Exception as exc:  # noqa: BLE001
            result["notes"].append(f"torch_npu unavailable: {type(exc).__name__}: {exc}")
    except Exception as exc:  # noqa: BLE001
        result["notes"].append(f"torch unavailable: {type(exc).__name__}: {exc}")
    if args.out:
        write_json(Path(args.out), result)
    print(json.dumps(result, indent=2, ensure_ascii=False))
    return result


def scan_file(path: Path, root: Path) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    attention_hits: List[Dict[str, Any]] = []
    feature_hits: List[Dict[str, Any]] = []
    try:
        text = path.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return attention_hits, feature_hits
    for line_no, line in enumerate(text.splitlines(), start=1):
        stripped = line.strip()[:220]
        lower = line.lower()
        for pattern in PATTERNS:
            if pattern in line:
                attention_hits.append({"file": str(path.relative_to(root)), "line": line_no, "pattern": pattern, "text": stripped})
        for feature, spec in FEATURE_PATTERNS.items():
            for token in spec["tokens"]:
                if token.lower() in lower:
                    feature_hits.append({"file": str(path.relative_to(root)), "line": line_no, "feature": feature, "risk": spec["risk"], "token": token, "text": stripped})
                    break
    return attention_hits, feature_hits


def summarize_compatibility(scan: Dict[str, Any]) -> Dict[str, Any]:
    attention_hits = scan.get("hits", [])
    feature_hits = scan.get("feature_hits", [])
    features = sorted({h.get("feature") for h in feature_hits if h.get("feature")})
    high = sorted({h.get("feature") for h in feature_hits if h.get("risk") == "HIGH"})
    medium = sorted({h.get("feature") for h in feature_hits if h.get("risk") == "MEDIUM"})
    patterns = {h.get("pattern") for h in attention_hits}

    if not attention_hits:
        risk_level = "UNKNOWN"
        decision = "REJECT"
        attention_type = "unknown"
        reasons = ["No attention interface symbol was found."]
    else:
        if "cross_attention" in high:
            attention_type = "cross_or_conditioned_attention"
        elif "causal_mask" in high or "kv_cache" in high:
            attention_type = "causal_or_cached_self_attention"
        else:
            attention_type = "self_attention_candidate"
        if high:
            risk_level = "HIGH"
            decision = "CANDIDATE_NEEDS_CUSTOM_ADAPTER"
            reasons = [f"High-risk semantics detected: {', '.join(high)}."]
        elif medium:
            risk_level = "MEDIUM"
            decision = "CANDIDATE_WITH_ADAPTER"
            reasons = [f"Medium-risk semantics detected: {', '.join(medium)}."]
        else:
            risk_level = "LOW"
            decision = "CANDIDATE"
            reasons = ["No known mask/position/cache/cross-attention risk feature was detected by static scan."]

    layout_guess = "unknown"
    if {"attn_op.local_attn", "local_attn", "WanSelfAttention"} & patterns:
        layout_guess = "likely adapter-level local attention; verify q/k/v layout at runtime"
    elif "qkv" in patterns:
        layout_guess = "qkv projection found; inspect split/reshape order"

    return {
        "attention_type": attention_type,
        "layout_guess": layout_guess,
        "features": features,
        "high_risk_features": high,
        "medium_risk_features": medium,
        "risk_level": risk_level,
        "migration_decision": decision,
        "reasons": reasons,
        "required_runtime_checks": [
            "q/k/v layout and dtype",
            "mask semantics equivalence",
            "exact-all dense-vs-SLA relative error/cosine",
            "sparse topk validation loss or rollout quality",
            "latency, peak memory, and OOM boundary",
        ],
    }


def cmd_scan(args: argparse.Namespace) -> Dict[str, Any]:
    repo_arg = args.repo
    repo = Path(repo_arg).expanduser().resolve()
    if not repo.exists():
        raise SystemExit(f"path not found: {repo_arg}")
    hits: List[Dict[str, Any]] = []
    feature_hits: List[Dict[str, Any]] = []
    if repo.is_file():
        h, f = scan_file(repo, repo.parent)
        hits.extend(h); feature_hits.extend(f)
    else:
        for path in repo.rglob("*"):
            if any(part in {".git", "__pycache__", "node_modules", ".venv"} for part in path.parts):
                continue
            if path.is_file() and path.suffix in {".py", ".md", ".txt"}:
                h, f = scan_file(path, repo)
                hits.extend(h); feature_hits.extend(f)
    result = {
        "repo": repo_arg,
        "patterns": PATTERNS,
        "feature_patterns": FEATURE_PATTERNS,
        "hit_count": len(hits),
        "feature_hit_count": len(feature_hits),
        "hits": hits[: args.max_hits],
        "feature_hits": feature_hits[: args.max_hits],
        "truncated": len(hits) > args.max_hits or len(feature_hits) > args.max_hits,
    }
    result["compatibility"] = summarize_compatibility(result)
    if args.out:
        write_json(Path(args.out), result)
    print(json.dumps(result, indent=2, ensure_ascii=False))
    return result


def status_rank(status: str) -> int:
    order = {"PASS": 0, "OPTIONAL_PASS": 0, "REPLAY_ONLY": 1, "OPTIONAL_UNTESTED": 1, "NEEDS_TARGET_VALIDATION": 2, "NEEDS_TUNING": 3, "FALLBACK": 4, "REJECT": 5, "UNKNOWN": 3}
    return order.get(status, 3)


def gate(name: str, status: str, evidence: str, recommendation: str = "") -> Dict[str, str]:
    out = {"name": name, "status": status, "evidence": evidence}
    if recommendation:
        out["recommendation"] = recommendation
    return out


def build_migration_plan(scan: Dict[str, Any]) -> Dict[str, Any]:
    compat = scan.get("compatibility") or summarize_compatibility(scan)
    hits = scan.get("hits", [])
    feature_hits = scan.get("feature_hits", [])
    candidate_layers = []
    for hit in hits:
        if hit.get("pattern") in {"attn_op.local_attn", "local_attn", "WanSelfAttention", "SparseLinearAttention"}:
            item = {"file": hit.get("file"), "line": hit.get("line"), "symbol": hit.get("pattern"), "strategy": "adapter-level candidate; keep public model I/O unchanged"}
            if item not in candidate_layers:
                candidate_layers.append(item)
    do_not_replace = []
    for hit in feature_hits:
        if hit.get("risk") == "HIGH":
            do_not_replace.append({"file": hit.get("file"), "line": hit.get("line"), "feature": hit.get("feature"), "reason": "high-risk semantics; require custom adapter or keep dense"})
    if compat["migration_decision"] == "REJECT":
        recommended_backend = "none"
        first_action = "inspect model manually or extend scanner"
    elif compat["risk_level"] == "HIGH":
        recommended_backend = "exact-all-first-with-custom-adapter"
        first_action = "preserve high-risk semantics, then run exact-all correctness before sparse mode"
    else:
        recommended_backend = "exact-all-first"
        first_action = "run exact-all dense-vs-SLA on the target q/k/v shape"
    return {
        "migration_decision": compat["migration_decision"],
        "risk_level": compat["risk_level"],
        "attention_type": compat["attention_type"],
        "candidate_layers": candidate_layers[:50],
        "do_not_replace_without_adapter": do_not_replace[:50],
        "recommended_backend": recommended_backend,
        "first_action": first_action,
        "fallback_policy": [
            "keep dense for cross-attention, cached causal decoding, or layers whose sparse gate fails",
            "use exact-all for correctness-sensitive layers",
            "use loop/reference fallback for OOM or debugging",
        ],
        "validation_gates": [
            "Gate 0 environment preflight",
            "Gate 1 attention interface and semantics",
            "Gate 2 exact-all correctness",
            "Gate 3 sparse quality/topk sweep",
            "Gate 4 backward/training smoke",
            "Gate 5 performance/memory/OOM boundary",
            "Gate 6 optional HCCL/DP smoke",
        ],
    }


def cmd_plan(args: argparse.Namespace) -> Dict[str, Any]:
    scan = load_json(Path(args.scan))
    plan = build_migration_plan(scan)
    if args.out:
        write_json(Path(args.out), plan)
    print(json.dumps(plan, indent=2, ensure_ascii=False))
    return plan


def build_gate_assessment(preflight: Dict[str, Any], scan: Dict[str, Any], metrics: Dict[str, Any] | None = None, plan: Dict[str, Any] | None = None) -> Dict[str, Any]:
    metrics = metrics or {}
    compat = scan.get("compatibility") or summarize_compatibility(scan)
    gates: List[Dict[str, str]] = []

    if preflight.get("npu_available"):
        gates.append(gate("Gate 0: environment", "PASS", f"NPU visible, count={preflight.get('npu_count')}", "Proceed to target-shape validation."))
    else:
        gates.append(gate("Gate 0: environment", "REPLAY_ONLY", "No local Ascend NPU visible in this run.", "Use replay/demo outputs only; rerun preflight on the target 910B before accepting migration."))

    hit_count = int(scan.get("hit_count", 0) or 0)
    if compat["migration_decision"] == "REJECT":
        gates.append(gate("Gate 1: attention interface", "REJECT", "No compatible attention interface found.", "Extend scanner rules or inspect q/k/v modules manually."))
    elif compat["risk_level"] == "HIGH":
        gates.append(gate("Gate 1: attention interface", "NEEDS_TARGET_VALIDATION", f"Found {hit_count} attention hits but high-risk features {compat['high_risk_features']}.", "Generate only a custom adapter candidate; preserve masks/cache/cross-attention semantics."))
    elif compat["risk_level"] == "MEDIUM":
        gates.append(gate("Gate 1: attention interface", "PASS", f"Found {hit_count} attention hits with medium-risk features {compat['medium_risk_features']}.", "Use adapter-level candidate and verify position/mask semantics with exact-all."))
    else:
        gates.append(gate("Gate 1: attention interface", "PASS", f"Found {hit_count} attention hits; static risk level LOW.", "Generate adapter-level candidate; do not change public model I/O."))

    rel = metrics.get("wan_l8192_relative_error", metrics.get("relative_error"))
    cosine = metrics.get("cosine")
    if rel is not None and float(rel) <= 1e-3:
        evidence = f"exact-all relative_error={float(rel):.6g}"
        if cosine is not None:
            evidence += f", cosine={float(cosine):.6g}"
        gates.append(gate("Gate 2: exact-all correctness", "PASS", evidence, "Interface/layout path is plausible; continue to sparse routing gates."))
    else:
        gates.append(gate("Gate 2: exact-all correctness", "NEEDS_TARGET_VALIDATION", "No target exact-all dense-vs-SLA metric is attached.", "Run exact-all routing against dense attention on the target q/k/v shape first."))

    sparse_pass = metrics.get("sparse_accuracy_pass")
    topk = metrics.get("topk_ratio", metrics.get("topk"))
    if sparse_pass is True:
        gates.append(gate("Gate 3: sparse quality", "PASS", f"Sparse quality metric passed at topk={topk}.", "Keep the measured topk/block-size in config."))
    elif sparse_pass is False:
        gates.append(gate("Gate 3: sparse quality", "NEEDS_TUNING", f"Sparse quality metric failed at topk={topk}.", "Increase topk, keep sensitive layers dense/exact-all, or limit replacement to late blocks."))
    else:
        gates.append(gate("Gate 3: sparse quality", "NEEDS_TUNING", "Sparse top-k quality is task-dependent and not proven by exact-all correctness.", "Run topk sweep and compare validation loss/rollout quality before accepting sparse mode."))

    loss_drop = metrics.get("dp4_relative_drop", metrics.get("relative_drop"))
    backward_ok = metrics.get("backward_ok")
    if backward_ok is True or (loss_drop is not None and float(loss_drop) >= 0.5):
        gates.append(gate("Gate 4: backward/training", "PASS", f"Training/backward evidence available; relative_drop={loss_drop}.", "Use distillation or warmup when enabling sparse mode."))
    else:
        gates.append(gate("Gate 4: backward/training", "NEEDS_TARGET_VALIDATION", "No target backward or training curve attached.", "Run backward smoke and a small public/synthetic distillation curve."))

    speedup = metrics.get("single_card_best_speedup", metrics.get("speedup"))
    if speedup is not None and float(speedup) > 1.0:
        gates.append(gate("Gate 5: performance/memory", "PASS", f"Measured speedup over reference path={float(speedup):.2f}x.", "Still benchmark against dense attention on target shape before production."))
    else:
        gates.append(gate("Gate 5: performance/memory", "NEEDS_TARGET_VALIDATION", "No target performance/memory metric attached.", "Benchmark dense, loop, block-batched, and sparse backends; report OOM/fallback boundaries."))

    if metrics.get("hccl_4card_all_ok") is True or metrics.get("multi_card_ok") is True:
        gates.append(gate("Gate 6: multi-card", "OPTIONAL_PASS", "HCCL/multi-card smoke evidence is attached.", "Only claim the tested DP/HCCL scope."))
    else:
        gates.append(gate("Gate 6: multi-card", "OPTIONAL_UNTESTED", "No multi-card metric attached for this target.", "Skip multi-card claims or run all_reduce + DP backward smoke."))

    statuses = [g["status"] for g in gates]
    if "REJECT" in statuses:
        decision = "REJECT"
        summary = "Do not generate an SLA replacement until a compatible attention interface is identified."
    elif "FALLBACK" in statuses:
        decision = "FALLBACK"
        summary = "Use dense/exact-all/loop fallback for the failing scope."
    elif any(s in statuses for s in ["NEEDS_TUNING", "NEEDS_TARGET_VALIDATION", "REPLAY_ONLY"]):
        decision = "NEEDS_TARGET_VALIDATION"
        summary = "SLA is a candidate backend, not an accepted replacement yet; run target-specific gates and tune/fallback as needed."
    else:
        decision = "ACCEPT_WITH_BOUNDARIES"
        summary = "The candidate passed attached gates, but claims are limited to the measured shapes/backends."

    recommendations = [g["recommendation"] for g in gates if g.get("recommendation")]
    return {"decision": decision, "summary": summary, "compatibility": compat, "plan": plan or build_migration_plan(scan), "gates": gates, "recommendations": recommendations}


def cmd_assess(args: argparse.Namespace) -> Dict[str, Any]:
    preflight = load_json(Path(args.preflight)) if args.preflight else {}
    scan = load_json(Path(args.scan)) if args.scan else {"hit_count": 0, "hits": [], "feature_hits": []}
    metrics: Dict[str, Any] = {}
    if args.metrics:
        metrics.update(load_json(Path(args.metrics)))
    plan = load_json(Path(args.plan)) if args.plan else None
    out = build_gate_assessment(preflight, scan, metrics, plan)
    if args.out:
        write_json(Path(args.out), out)
    print(json.dumps(out, indent=2, ensure_ascii=False))
    return out


def gate_markdown(assessment: Dict[str, Any]) -> str:
    rows = "\n".join(f"| {g['name']} | {g['status']} | {g['evidence']} | {g.get('recommendation', '')} |" for g in assessment.get("gates", []))
    recs = "\n".join(f"- {r}" for r in assessment.get("recommendations", [])) or "- No additional recommendation."
    compat = assessment.get("compatibility", {})
    return f"""\n\n## Gate-based migration decision\n\nDecision: `{assessment.get('decision')}`\n\n{assessment.get('summary')}\n\n### Compatibility summary\n\n- attention_type: `{compat.get('attention_type')}`\n- risk_level: `{compat.get('risk_level')}`\n- migration_decision: `{compat.get('migration_decision')}`\n- detected_features: `{compat.get('features')}`\n\n| Gate | Status | Evidence | Recommendation |\n|---|---|---|---|\n{rows}\n\n### Recommendations\n\n{recs}\n"""


def plan_markdown(plan: Dict[str, Any] | None) -> str:
    if not plan:
        return ""
    layers = "\n".join(f"- {x.get('file')}:{x.get('line')} `{x.get('symbol')}` — {x.get('strategy')}" for x in plan.get("candidate_layers", [])[:20]) or "- No candidate layer identified."
    blocked = "\n".join(f"- {x.get('file')}:{x.get('line')} `{x.get('feature')}` — {x.get('reason')}" for x in plan.get("do_not_replace_without_adapter", [])[:20]) or "- None from static scan."
    return f"""\n\n## Candidate migration plan\n\n- decision: `{plan.get('migration_decision')}`\n- risk_level: `{plan.get('risk_level')}`\n- recommended_backend: `{plan.get('recommended_backend')}`\n- first_action: {plan.get('first_action')}\n\n### Candidate layers\n\n{layers}\n\n### Do not replace without adapter\n\n{blocked}\n"""


def report_text(preflight: Dict[str, Any], scan: Dict[str, Any], assessment: Dict[str, Any] | None = None, plan: Dict[str, Any] | None = None) -> str:
    hit_rows = "\n".join(f"| {hit['file']} | {hit['line']} | `{hit['pattern']}` | `{hit['text']}` |" for hit in scan.get("hits", [])[:30]) or "| - | - | - | No attention-related symbols found. |"
    feature_rows = "\n".join(f"| {hit['file']} | {hit['line']} | `{hit['feature']}` | `{hit['risk']}` | `{hit['text']}` |" for hit in scan.get("feature_hits", [])[:30]) or "| - | - | - | - | No risk features found by static scan. |"
    plan = plan or build_migration_plan(scan)
    assessment = assessment or build_gate_assessment(preflight, scan, {}, plan)
    return f"""# WorldSLA-NPU Migration Report\n\n## 1. Environment preflight\n\n| Item | Value |\n|---|---|\n| Python | `{preflight.get('python')}` |\n| Platform | `{preflight.get('platform')}` |\n| torch | `{preflight.get('torch')}` |\n| torch_npu | `{preflight.get('torch_npu')}` |\n| NPU available | `{preflight.get('npu_available')}` |\n| NPU count | `{preflight.get('npu_count')}` |\n\nNotes: {preflight.get('notes', [])}\n\n## 2. Attention scan\n\nTarget: `{scan.get('repo')}`\n\n| File | Line | Pattern | Context |\n|---|---:|---|---|\n{hit_rows}\n\n## 3. Static semantic risk scan\n\n| File | Line | Feature | Risk | Context |\n|---|---:|---|---|---|\n{feature_rows}\n\n{plan_markdown(plan)}\n\n## 4. Claim boundary\n\nThis report is a workflow artifact. Only claim NPU performance, sparse quality, distributed readiness, fused-kernel speedup, or training quality when the exact gate experiments have been run and logs are attached.\n{gate_markdown(assessment)}\n"""


def cmd_report(args: argparse.Namespace) -> Dict[str, Any]:
    preflight = load_json(Path(args.preflight))
    scan = load_json(Path(args.scan))
    plan = load_json(Path(args.plan)) if getattr(args, "plan", None) else build_migration_plan(scan)
    assessment = load_json(Path(args.assessment)) if getattr(args, "assessment", None) else build_gate_assessment(preflight, scan, {}, plan)
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(report_text(preflight, scan, assessment, plan), encoding="utf-8")
    result = {"report": str(out), "assessment": getattr(args, "assessment", None), "plan": getattr(args, "plan", None)}
    print(json.dumps(result, indent=2, ensure_ascii=False))
    return result


def cmd_demo(args: argparse.Namespace) -> None:
    workspace = Path(args.workspace).resolve()
    old_cwd = os.getcwd()
    try:
        os.chdir(workspace)
        out_dir = Path("demo_outputs")
        out_dir.mkdir(exist_ok=True)
        cmd_preflight(argparse.Namespace(out=str(out_dir / "preflight.json"), quick_matmul=False))
        cmd_scan(argparse.Namespace(repo="examples/sample_attention_module.py", out=str(out_dir / "scan.json"), max_hits=200))
        cmd_plan(argparse.Namespace(scan=str(out_dir / "scan.json"), out=str(out_dir / "migration_plan.json")))
        cmd_assess(argparse.Namespace(preflight=str(out_dir / "preflight.json"), scan=str(out_dir / "scan.json"), metrics=None, plan=str(out_dir / "migration_plan.json"), out=str(out_dir / "gate_decision.json")))
        cmd_report(argparse.Namespace(preflight=str(out_dir / "preflight.json"), scan=str(out_dir / "scan.json"), plan=str(out_dir / "migration_plan.json"), assessment=str(out_dir / "gate_decision.json"), out=str(out_dir / "migration_report.md")))
        print(f"Demo complete: {out_dir / 'migration_report.md'}")
    finally:
        os.chdir(old_cwd)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="WorldSLA-NPU skill helper CLI")
    sub = parser.add_subparsers(dest="cmd", required=True)
    p = sub.add_parser("preflight"); p.add_argument("--out"); p.add_argument("--quick-matmul", action="store_true"); p.set_defaults(func=cmd_preflight)
    p = sub.add_parser("scan"); p.add_argument("--repo", required=True); p.add_argument("--out"); p.add_argument("--max-hits", type=int, default=300); p.set_defaults(func=cmd_scan)
    p = sub.add_parser("plan"); p.add_argument("--scan", required=True); p.add_argument("--out"); p.set_defaults(func=cmd_plan)
    p = sub.add_parser("assess"); p.add_argument("--preflight"); p.add_argument("--scan"); p.add_argument("--metrics"); p.add_argument("--plan"); p.add_argument("--out"); p.set_defaults(func=cmd_assess)
    p = sub.add_parser("report"); p.add_argument("--preflight", required=True); p.add_argument("--scan", required=True); p.add_argument("--plan"); p.add_argument("--assessment"); p.add_argument("--out", required=True); p.set_defaults(func=cmd_report)
    p = sub.add_parser("demo"); p.add_argument("--workspace", required=True); p.set_defaults(func=cmd_demo)
    return parser


def main() -> None:
    args = build_parser().parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
