---
name: codegraph-qa
description: Use CodeScope to analyze any indexed codebase via its graph database (neug) and vector index (zvec). Covers call graphs, dependency analysis, dead code detection, hotspots, module coupling, architectural layering, commit history, change attribution, semantic code search, impact analysis, and full architecture reports. Use this skill whenever the user asks about code structure, code dependencies, who calls what, why something changed, finding similar functions, generating architecture reports, understanding module boundaries, or any question that benefits from a code knowledge graph — even if they don't mention "CodeScope" by name. If a `.codegraph` or similar index directory exists in the workspace, this skill applies.
---

# CodeScope Q&A

CodeScope indexes source code into a two-layer knowledge graph — **structure** (functions, calls, imports, classes, modules) and **evolution** (commits, file changes, function modifications) — plus **semantic embeddings** for every function. This combination enables analyses that grep, LSP, or pure vector search cannot do alone.

## When to Use This Skill

- User asks about call chains, callers, callees, or dependencies
- User wants to find dead code, hotspots, or architectural layers
- User asks about code history, who changed what, or why something was modified
- User wants to find semantically similar functions across a codebase
- User wants a full architecture analysis or report
- User asks about module coupling, circular dependencies, or bridge functions
- A `.codegraph` directory (or similar index) exists in the workspace

## Getting Started

### Installation

```bash
pip install codegraph-ai
```

### Environment Variables (optional)

```bash
# Create Python virtural environment
python -m venv .venv

source .venv/bin/activate

# Point to a pre-built database (skip indexing)
export CODESCOPE_DB_DIR="/path/to/.linux_db"

# Offline mode for HuggingFace models
export HF_HUB_OFFLINE="1"
```

### Check Index Status

```bash
codegraph status --db $CODESCOPE_DB_DIR
```

If no index exists, create one:

```bash
codegraph init --repo . --lang auto --commits 500
```

The `--commits` flag ingests git history (for evolution queries). Without it, only structural analysis is available. Add `--backfill-limit 200` to also compute function-level `MODIFIES` edges (slower but enables `change_attribution` and `co_change`).

## Two Interfaces: CLI vs Python

**Use the CLI** for status and reports:

```bash
codegraph status --db $CODESCOPE_DB_DIR
codegraph analyze --db $CODESCOPE_DB_DIR --output report.md
```

**Use the Python API** for queries and custom analyses:

```python
import os
os.environ['HF_HUB_OFFLINE'] = '1'  # required

from codegraph.core import CodeScope
cs = CodeScope(os.environ['CODESCOPE_DB_DIR'])

# Cypher query
rows = list(cs.conn.execute('''
    MATCH (caller:Function)-[:CALLS]->(f:Function {name: "free_irq"})
    RETURN caller.name, caller.file_path LIMIT 10
'''))
for r in rows:
    print(r)

cs.close()  # always close when done
```

The Python API is more powerful — it gives you raw Cypher access and lets you chain queries.

## Core Python API

### Raw Queries

These are the building blocks for any custom analysis:

| Method | What it does |
|--------|-------------|
| `cs.conn.execute(cypher)` | Run any Cypher query against the graph — returns list of tuples |
| `cs.vector_only_search(query, topk=10)` | Semantic search over all function embeddings — returns `[{id, score}]` |
| `cs.summary()` | Print a human-readable overview of the indexed codebase |

### Structural Analysis

| Method | What it does |
|--------|-------------|
| `cs.impact(func_name, change_desc, max_hops=3)` | Find callers up to N hops, ranked by semantic relevance to the change |
| `cs.hotspots(topk=10)` | Rank functions by structural risk (fan-in × fan-out) |
| `cs.dead_code()` | Find functions with zero callers (excluding entry points) |
| `cs.circular_deps()` | Detect circular import chains at file level |
| `cs.module_coupling(topk=10)` | Find cross-module coupling pairs with call counts |
| `cs.bridge_functions(topk=30)` | Find functions called from the most distinct modules |
| `cs.layer_discovery(topk=30)` | Auto-discover infrastructure / mid / consumer layers |
| `cs.stability_analysis(topk=50)` | Correlate fan-in with modification frequency |
| `cs.class_hierarchy(class_name=None)` | Return inheritance tree for a class (or all classes) |

### Semantic Search

| Method | What it does |
|--------|-------------|
| `cs.similar(function, scope, topk=10)` | Find functions similar to a given function within a module scope |
| `cs.cross_locate(query, topk=10)` | Find semantically related functions, then reveal call-chain connections |
| `cs.semantic_cross_pollination(query, topk=15)` | Find similar functions across distant subsystems |

### Evolution (requires `--commits` during init)

| Method | What it does |
|--------|-------------|
| `cs.change_attribution(func_name, file_path=None, limit=20)` | Which commits modified a function? (requires backfill) |
| `cs.co_change(func_name, file_path=None, min_commits=2, topk=10)` | Functions that are always modified together |
| `cs.intent_search(query, topk=10)` | Find commits matching a natural-language intent |
| `cs.commit_modularity(topk=20)` | Score commits by how many modules they touch |
| `cs.hot_cold_map(topk=30)` | Module modification density |

### Report Generation

```python
from codegraph.analyzer import generate_report
report = generate_report(cs)  # full architecture analysis as markdown
```

Or via CLI:

```bash
codegraph analyze --output reports/analysis.md
```

The report covers: overview stats, subsystem distribution, top modules, architectural layers (with Mermaid diagrams), bridge functions, fan-in/fan-out hotspots, cross-module coupling, evolution hotspots, and dead code density.

## How to Route Questions

The key decision is: **does the user want an exact structural answer, or a fuzzy semantic one?**

| User asks... | Best approach |
|-------------|---------------|
| "Who calls `free_irq`?" | Cypher: `MATCH (c:Function)-[:CALLS]->(f:Function {name: 'free_irq'}) RETURN c.name, c.file_path` |
| "Find functions related to memory allocation" | `cs.vector_only_search("memory allocation")` or `cs.cross_locate("memory allocation")` |
| "What's the most complex function?" | `cs.hotspots(topk=1)` |
| "Is there dead code in the networking stack?" | `cs.dead_code()` then filter by file path |
| "How has `schedule()` changed recently?" | `cs.change_attribution("schedule", "kernel/sched/core.c")` |
| "Which modules are tightly coupled?" | `cs.module_coupling(topk=20)` |
| "Generate a full architecture report" | `codegraph analyze` or `generate_report(cs)` |
| "What's the architectural role of `mm/`?" | `cs.layer_discovery()` then find `mm` entries |
| "Which functions act as API boundaries?" | `cs.bridge_functions(topk=30)` |
| "Find commits about fixing race conditions" | `cs.intent_search("fix race condition")` |
| "What functions are always changed together with `kmalloc`?" | `cs.co_change("kmalloc")` |

For **novel investigations** not covered by pre-built methods, compose raw Cypher queries. See [patterns.md](./patterns.md) for templates.

## Important Filters for Cypher

When writing Cypher queries, these filters prevent misleading results:

- **`f.is_historical = 0`** — exclude deleted/renamed functions that are still in the graph as historical records
- **`f.is_external = 0`** (on File nodes) — exclude system headers/library files
- **`c.version_tag = 'bf'`** — only backfilled commits have `MODIFIES` edges; non-backfilled commits only have `TOUCHES` (file-level) edges
- **Always use `LIMIT`** — large codebases can return hundreds of thousands of rows

## Checking Data Availability

Before running evolution queries, check what's available:

```python
# How many commits are indexed?
list(cs.conn.execute("MATCH (c:Commit) RETURN count(c)"))

# How many have MODIFIES edges (backfilled)?
list(cs.conn.execute("MATCH (c:Commit) WHERE c.version_tag = 'bf' RETURN count(c)"))
```

If no commits exist, evolution methods will return empty results — guide the user to run `codegraph ingest` first. If commits exist but aren't backfilled, `TOUCHES` (file-level) queries still work but `MODIFIES` (function-level) queries won't.

## Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| `Database locked` | Crashed process left neug lock | `rm <db>/graph.db/neugdb.lock` |
| `Can't open lock file` | zvec LOCK file deleted | `touch <db>/vectors/LOCK` |
| `Can't lock read-write collection` | Another process holds lock | Kill the other process |
| `recovery idmap failed` | Stale WAL files | Remove empty `.log` files from `<db>/vectors/idmap.0/` |

The CLI auto-cleans lock issues on startup when possible.

## References

- **[schema.md](./schema.md)** — Full graph schema: node types, edge types, properties, Cypher syntax notes
- **[patterns.md](./patterns.md)** — Ready-to-use Cypher query templates and composition strategies
