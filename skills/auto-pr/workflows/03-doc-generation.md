---
name: Documentation Generation
importance: ⭐⭐⭐
---

# 03 - Documentation Generation

## Goal

Generate English PR description documents, confirmed by the user for PR creation.

## Execution Flow

### Step 1: Find PR Template ⭐⭐⭐

Scan the project directory, searching for templates by priority:

```
1. .github/pull_request_template.md
2. .github/PULL_REQUEST_TEMPLATE.md
3. .github/PULL_REQUEST_TEMPLATE/default.md
4. docs/pull_request_template.md
5. PULL_REQUEST_TEMPLATE.md
```

**After finding template**:
- Show the user the template path and content summary
- Ask if the user wants to use this template

**If no template found**:
- Inform the user no template was found
- Ask if the user can provide a custom template path
- Or use the default template structure

### Step 2: Generate English Documentation ⭐⭐⭐

Based on the template and code differences, generate an English PR description:

**Output file**: `PR_DESCRIPTION.md`

**Content structure** (adjust according to template):
- Title
- TLDR (brief overview)
- Change details
- Test plan
- Related Issues

### Step 3: Wait for User Confirmation ⭐⭐⭐

**Important**: After generating the English documentation, pause and wait for user confirmation.

Inform the user:
```
English PR description has been generated: PR_DESCRIPTION.md
Please check if the content is accurate, edit the file directly if needed.
After confirming everything is correct, let me know and I will proceed with PR submission.
```

**Waiting for user instruction**:
- User confirms OK → Proceed to Step 4
- User requests modifications → Wait for user changes before confirmation
- User provides modification suggestions → Modify according to suggestions and confirm again

### Step 4: Prepare for Submission ⭐⭐

The English document will be used for PR description, proceeding to the next workflow [04-PR Submission](./04-pr-submission.md).

**Note**: After PR submission is complete, temporary description files (PR_DESCRIPTION.md, PR_DESCRIPTION_*.md) will be offered for deletion to keep the repository clean.

## Checklist

- [ ] PR template has been located and confirmed
- [ ] English documentation generated as `PR_DESCRIPTION.md`
- [ ] User has confirmed English content
- [ ] Ready to proceed with PR submission process
