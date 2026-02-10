---
name: Branch Preparation
importance: ⭐⭐⭐
---

# 01 - Branch Preparation

## Goal

Ensure the local branch is synchronized with the remote, preparing for PR submission.

## Checklist

### Basic Checks ⭐⭐⭐

- [ ] Confirm not on main/master branch
- [ ] Confirm working directory is clean (no uncommitted changes)
- [ ] Confirm there are commits to be pushed

### Branch Sync ⭐⭐⭐

- [ ] Fetch remote updates: `git fetch origin`
- [ ] Update base branch: `git checkout main && git pull origin main`
- [ ] Switch back to working branch: `git checkout -`
- [ ] Rebase to latest base (optional): `git rebase main`

## Commands

```bash
# 1. Check current branch
git branch --show-current

# 2. Check working directory status
git status

# 3. Fetch remote updates
git fetch origin

# 4. Update main branch
git checkout main && git pull origin main && git checkout -
```

## Error Handling

| Problem | Solution |
|---------|----------|
| Uncommitted changes exist | Commit or stash first |
| Rebase conflicts | Resolve conflicts then `git rebase --continue` |
| Remote branch doesn't exist | Check remote configuration `git remote -v` |
