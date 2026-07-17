---
name: commit-message-generator
description: Generate an industry-standard conventional commit message and ready-to-run git commit command from the current unpushed changes in a repository. Use when the user wants help summarizing staged or unstaged modifications, new files, and deleted files into a high-quality commit message.
---

# Commit Message Generator

Use this skill when you need to turn the current unpushed work in a git repository into a commit message and commit command.

## Workflow

1. Inspect the git state.
2. Identify the relevant changes that are not yet pushed.
3. Summarize the change set by theme, not file-by-file noise.
4. Choose the most accurate conventional commit type.
5. Write a detailed subject and body.
6. Produce a safe git commit command the user can run.

## Required Analysis

Use git to inspect:

- `git status --short`
- `git diff --stat`
- `git diff --cached --stat`
- `git log --oneline --decorate --graph --max-count=20 --all`
- `git branch -vv`

If the repository has an upstream branch, compare against it to find unpushed work:

- `git rev-list --left-right --count @{u}...HEAD`
- `git log --oneline @{u}..HEAD`

If there is no upstream, fall back to the local working tree and staged changes.

## Message Format

Prefer conventional commits:

- `feat:` new user-facing capability
- `fix:` bug fix
- `refactor:` behavior-preserving code change
- `docs:` documentation only
- `test:` tests only
- `chore:` tooling, dependency, or maintenance work
- `perf:` measurable performance improvement
- `build:` build system or dependency management
- `ci:` CI configuration only

When multiple areas changed, choose the dominant intent. If the change set is mixed, use a broad type like `chore:` or `refactor:` and explain the subchanges in the body.

## Subject Rules

- Keep the subject imperative and specific.
- Aim for 50 characters or fewer when practical.
- Mention the highest-level outcome, not the implementation details.

## Body Rules

- Explain why the change exists.
- Summarize major code paths changed.
- Mention notable risks, migrations, or follow-up work.
- Include tests or verification performed, if any.

## Output

Return:

1. A recommended commit type and scope, if useful.
2. A polished commit message in a fenced code block.
3. A ready-to-run git commit command.
4. A brief note telling the user whether to stage changes first, if needed.

## Safety

- Do not assume all modified files should be committed together if the diff clearly contains unrelated work.
- If the repo has both staged and unstaged changes, mention that the user may want to stage selectively before committing.
- Never fabricate change details that are not visible in the diff.
