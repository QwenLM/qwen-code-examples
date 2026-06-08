#!/usr/bin/env python3
"""WorldSLA-NPU Qwen Code skill helper CLI.

This utility intentionally stays lightweight: it can run on CPU-only machines for
preflight/report demos, while gracefully detecting torch_npu when present.
"""
from __future__ import annotations
import argparse
import json
import os
import platform
import sys
import time
from pathlib import Path
from typing import Any, Dict, List

PATTERNS = [
    "WanSelfAttention",
    "SparseLinearAttention",
    "SageSparseLinearAttention",
    "attn_op.local_attn",
    "local_attn",
    "replace_attention",
    "flash_attn",
    "triton",
]


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


def scan_file(path: Path, root: Path) -> List[Dict[str, Any]]:
    hits: List[Dict[str, Any]] = []
    try:
        text = path.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return hits
    for line_no, line in enumerate(text.splitlines(), start=1):
        for pattern in PATTERNS:
            if pattern in line:
                hits.append(
                    {
                        "file": str(path.relative_to(root)),
                        "line": line_no,
                        "pattern": pattern,
                        "text": line.strip()[:220],
                    }
                )
    return hits


def cmd_scan(args: argparse.Namespace) -> Dict[str, Any]:
    repo_arg = args.repo
    repo = Path(repo_arg).expanduser().resolve()
    if not repo.exists():
        raise SystemExit(f"path not found: {repo_arg}")
    hits: List[Dict[str, Any]] = []
    if repo.is_file():
        hits.extend(scan_file(repo, repo.parent))
    else:
        for path in repo.rglob("*"):
            if any(part in {".git", "__pycache__", "node_modules", ".venv"} for part in path.parts):
                continue
            if path.is_file() and path.suffix in {".py", ".md", ".txt"}:
                hits.extend(scan_file(path, repo))
    result = {
        "repo": repo_arg,
        "patterns": PATTERNS,
        "hit_count": len(hits),
        "hits": hits[: args.max_hits],
        "truncated": len(hits) > args.max_hits,
    }
    if args.out:
        write_json(Path(args.out), result)
    print(json.dumps(result, indent=2, ensure_ascii=False))
    return result



def status_rank(status: str) -> int:
    order = {
        "PASS": 0,
        "OPTIONAL_PASS": 0,
        "REPLAY_ONLY": 1,
        "OPTIONAL_UNTESTED": 1,
        "NEEDS_TARGET_VALIDATION": 2,
        "NEEDS_TUNING": 3,
        "FALLBACK": 4,
        "REJECT": 5,
        "UNKNOWN": 3,
    }
    return order.get(status, 3)


def gate(name: str, status: str, evidence: str, recommendation: str = "") -> Dict[str, str]:
    out = {"name": name, "status": status, "evidence": evidence}
    if recommendation:
        out["recommendation"] = recommendation
    return out


def build_gate_assessment(preflight: Dict[str, Any], scan: Dict[str, Any], metrics: Dict[str, Any] | None = None) -> Dict[str, Any]:
    """Build a conservative gate-based migration decision.

    The assessment deliberately avoids claiming that replacing attention with SLA is always valid.
    It returns whether the candidate is rejected, needs target validation/tuning, or is acceptable
    only within validated boundaries.
    """
    metrics = metrics or {}
    gates: List[Dict[str, str]] = []

    if preflight.get("npu_available"):
        gates.append(gate("Gate 0: environment", "PASS", f"NPU visible, count={preflight.get('npu_count')}", "Proceed to target-shape validation."))
    else:
        gates.append(gate("Gate 0: environment", "REPLAY_ONLY", "No local Ascend NPU visible in this run.", "Use replay/demo outputs only; rerun preflight on the target 910B before accepting migration."))

    hit_count = int(scan.get("hit_count", 0) or 0)
    patterns = {h.get("pattern") for h in scan.get("hits", [])}
    if hit_count == 0:
        gates.append(gate("Gate 1: attention interface", "REJECT", "No attention-related symbol was found.", "Add model-specific scanner rules or inspect q/k/v modules manually."))
    elif {"WanSelfAttention", "SparseLinearAttention", "attn_op.local_attn", "local_attn"} & patterns:
        gates.append(gate("Gate 1: attention interface", "PASS", f"Found {hit_count} attention-related hits: {sorted(str(p) for p in patterns if p)}", "Generate an adapter-level candidate; do not change public model I/O."))
    else:
        gates.append(gate("Gate 1: attention interface", "NEEDS_TARGET_VALIDATION", f"Found {hit_count} generic attention hits: {sorted(str(p) for p in patterns if p)}", "Inspect masks, RoPE/position bias, cache, and cross-attention semantics before replacement."))

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
        summary = "Do not generate an SLA replacement until an attention interface is identified."
    elif any(s in statuses for s in ["NEEDS_TUNING", "NEEDS_TARGET_VALIDATION", "REPLAY_ONLY"]):
        decision = "NEEDS_TARGET_VALIDATION"
        summary = "SLA is a candidate backend, not an accepted replacement yet; run target-specific gates and tune/fallback as needed."
    else:
        decision = "ACCEPT_WITH_BOUNDARIES"
        summary = "The candidate passed attached gates, but claims are limited to the measured shapes/backends."

    recommendations = [g["recommendation"] for g in gates if g.get("recommendation")]
    return {
        "decision": decision,
        "summary": summary,
        "gates": gates,
        "recommendations": recommendations,
    }


def cmd_assess(args: argparse.Namespace) -> Dict[str, Any]:
    preflight = load_json(Path(args.preflight)) if args.preflight else {}
    scan = load_json(Path(args.scan)) if args.scan else {"hit_count": 0, "hits": []}
    metrics: Dict[str, Any] = {}
    if args.metrics:
        metrics.update(load_json(Path(args.metrics)))
    out = build_gate_assessment(preflight, scan, metrics)
    if args.out:
        write_json(Path(args.out), out)
    print(json.dumps(out, indent=2, ensure_ascii=False))
    return out


def gate_markdown(assessment: Dict[str, Any]) -> str:
    rows = "\n".join(
        f"| {g['name']} | {g['status']} | {g['evidence']} | {g.get('recommendation', '')} |"
        for g in assessment.get("gates", [])
    )
    recs = "\n".join(f"- {r}" for r in assessment.get("recommendations", [])) or "- No additional recommendation."
    return f"""\n\n## Gate-based migration decision\n\nDecision: `{assessment.get('decision')}`\n\n{assessment.get('summary')}\n\n| Gate | Status | Evidence | Recommendation |\n|---|---|---|---|\n{rows}\n\n### Recommendations\n\n{recs}\n"""


def report_text(preflight: Dict[str, Any], scan: Dict[str, Any], assessment: Dict[str, Any] | None = None) -> str:
    hit_rows = "\n".join(
        f"| {hit['file']} | {hit['line']} | `{hit['pattern']}` | `{hit['text']}` |"
        for hit in scan.get("hits", [])[:30]
    ) or "| - | - | - | No attention-related symbols found. |"
    assessment = assessment or build_gate_assessment(preflight, scan, {})
    gates = gate_markdown(assessment)
    return f"""# WorldSLA-NPU Migration Report

## 1. Environment preflight

| Item | Value |
|---|---|
| Python | `{preflight.get('python')}` |
| Platform | `{preflight.get('platform')}` |
| torch | `{preflight.get('torch')}` |
| torch_npu | `{preflight.get('torch_npu')}` |
| NPU available | `{preflight.get('npu_available')}` |
| NPU count | `{preflight.get('npu_count')}` |

Notes: {preflight.get('notes', [])}

## 2. Attention scan

Target: `{scan.get('repo')}`

| File | Line | Pattern | Context |
|---|---:|---|---|
{hit_rows}

## 3. Suggested migration plan

1. Preserve the target module's public input/output contract.
2. Add an adapter around the internal local attention callable, such as `attn_op.local_attn` or `local_attn`.
3. Validate exact-all routing against dense attention before enabling sparse top-k routing.
4. Run sparse forward/backward smoke on the target NPU.
5. Measure latency, peak memory, and loss/quality impact on public or synthetic data before production use.

## 4. Claim boundary

This report is a workflow artifact. Only claim NPU performance, distributed readiness, fused-kernel speedup, or training quality when the exact experiments have been run and the logs are attached.
{gates}
"""


def cmd_report(args: argparse.Namespace) -> Dict[str, Any]:
    preflight = load_json(Path(args.preflight))
    scan = load_json(Path(args.scan))
    assessment = load_json(Path(args.assessment)) if getattr(args, "assessment", None) else build_gate_assessment(preflight, scan, {})
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(report_text(preflight, scan, assessment), encoding="utf-8")
    result = {"report": str(out), "assessment": getattr(args, "assessment", None)}
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
        cmd_scan(
            argparse.Namespace(
                repo="examples/sample_attention_module.py",
                out=str(out_dir / "scan.json"),
                max_hits=200,
            )
        )
        cmd_assess(
            argparse.Namespace(
                preflight=str(out_dir / "preflight.json"),
                scan=str(out_dir / "scan.json"),
                metrics=None,
                out=str(out_dir / "gate_decision.json"),
            )
        )
        cmd_report(
            argparse.Namespace(
                preflight=str(out_dir / "preflight.json"),
                scan=str(out_dir / "scan.json"),
                assessment=str(out_dir / "gate_decision.json"),
                out=str(out_dir / "migration_report.md"),
            )
        )
        print(f"Demo complete: {out_dir / 'migration_report.md'}")
    finally:
        os.chdir(old_cwd)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="WorldSLA-NPU skill helper CLI")
    sub = parser.add_subparsers(dest="cmd", required=True)

    p = sub.add_parser("preflight")
    p.add_argument("--out")
    p.add_argument("--quick-matmul", action="store_true")
    p.set_defaults(func=cmd_preflight)

    p = sub.add_parser("scan")
    p.add_argument("--repo", required=True)
    p.add_argument("--out")
    p.add_argument("--max-hits", type=int, default=300)
    p.set_defaults(func=cmd_scan)

    p = sub.add_parser("assess")
    p.add_argument("--preflight")
    p.add_argument("--scan")
    p.add_argument("--metrics")
    p.add_argument("--out")
    p.set_defaults(func=cmd_assess)

    p = sub.add_parser("report")
    p.add_argument("--preflight", required=True)
    p.add_argument("--scan", required=True)
    p.add_argument("--assessment")
    p.add_argument("--out", required=True)
    p.set_defaults(func=cmd_report)

    p = sub.add_parser("demo")
    p.add_argument("--workspace", required=True)
    p.set_defaults(func=cmd_demo)
    return parser


def main() -> None:
    args = build_parser().parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
