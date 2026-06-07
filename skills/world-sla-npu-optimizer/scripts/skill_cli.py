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


def report_text(preflight: Dict[str, Any], scan: Dict[str, Any]) -> str:
    hit_rows = "\n".join(
        f"| {hit['file']} | {hit['line']} | `{hit['pattern']}` | `{hit['text']}` |"
        for hit in scan.get("hits", [])[:30]
    ) or "| - | - | - | No attention-related symbols found. |"
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
"""


def cmd_report(args: argparse.Namespace) -> Dict[str, Any]:
    preflight = load_json(Path(args.preflight))
    scan = load_json(Path(args.scan))
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(report_text(preflight, scan), encoding="utf-8")
    result = {"report": str(out)}
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
        cmd_report(
            argparse.Namespace(
                preflight=str(out_dir / "preflight.json"),
                scan=str(out_dir / "scan.json"),
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

    p = sub.add_parser("report")
    p.add_argument("--preflight", required=True)
    p.add_argument("--scan", required=True)
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
