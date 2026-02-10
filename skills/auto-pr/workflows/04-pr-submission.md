---
name: PR Submission
importance: ⭐⭐⭐
---

# 04 - PR Submission

## Goal

Push code and create Pull Request.

## Checklist

### Push Preparation ⭐⭐⭐

- [ ] Confirm all changes are committed
- [ ] Confirm branch name is correct
- [ ] Confirm remote repository configuration is correct

### PR Creation ⭐⭐⭐

- [ ] Push branch to remote
- [ ] Use script to create PR
- [ ] Set PR title and description
- [ ] Add reviewers (optional)
- [ ] Add labels (optional)

## Clean Up Process ⭐⭐

After PR submission, clean up temporary description files:
- [ ] Check for generated PR description files (PR_DESCRIPTION.md, PR_DESCRIPTION_*.md)
- [ ] Ask user for confirmation to delete these files
- [ ] Delete upon user approval to keep repository clean

## Use Script to Create PR

### Script Location

```
./scripts/create-pr.js
```

### Basic Usage

```bash
# Create using PR description file
node ./scripts/create-pr.js \
  --title "feat: add new feature" \
  --body-file ./PR_DESCRIPTION.md \
  --base main

# Create draft PR
node ./scripts/create-pr.js \
  --title "wip: work in progress" \
  --draft

# Add reviewers and labels
node ./scripts/create-pr.js \
  --title "fix: fix issue" \
  --reviewer user1 \
  --label bug
```

### Parameter Description

| Parameter | Short | Description |
|-----------|-------|-------------|
| `--title` | `-t` | PR title (required) |
| `--body` | `-b` | PR description content |
| `--body-file` | `-f` | PR description file path |
| `--base` | | Target branch (default main) |
| `--draft` | `-d` | Create as draft |
| `--reviewer` | `-r` | Reviewer (can be used multiple times) |
| `--label` | `-l` | Label (can be used multiple times) |
| `--no-push` | | Don't push automatically |

## Prerequisites

- [ ] GitHub CLI installed (`gh`)
- [ ] Completed `gh auth login` authentication
- [ ] Current branch is not main/master
- [ ] No uncommitted changes
