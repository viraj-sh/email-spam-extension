# Contributing Guidelines

## Branching Strategy

We follow a **simplified Git Flow**.

### Branches

| Branch      | Purpose                                                    |
| ----------- | ---------------------------------------------------------- |
| `main`      | Always stable, deployable code. **Never commit directly.** |
| `develop`   | Integration branch for features and bug fixes.             |
| `feature/*` | Individual feature branches. One task per branch.          |
| `bugfix/*`  | Bug fixes.                                                 |

### Rules

- ❌ No one commits directly to `main`.
- ❌ Avoid committing directly to `develop` unless it's a small fix.
- ✅ Each task gets its own branch: `feature/your-task-name`.

---

## Pull Request (PR)

All code must go through **PRs**—no exceptions.

### PR Rules

- PR must be **from `feature/*` → `develop`**
- Clear title & description
- Mention **what changed**
- Mention **how to test**
- At least **1 team member must review**
- **Author cannot merge their own PR**

---

## Commit Message Standards

We follow **Conventional Commits** to keep history clean.

### Format

```
type(scope): short description
```

### Type

- `feat` → new feature
- `fix` → bug fix
- `refactor` → code changes without new feature or bug fix
- `test` → tests
- `docs` → documentation
- `chore` → maintenance (dependencies, scripts)

### Scope

- Area/module affected (e.g., `auth`, `api`, `db`)

### Examples

```bash
feat(auth): add JWT login support
fix(api): handle empty request body
refactor(db): simplify query logic
test(auth): add login failure tests
```

### Rule

- ✅ One commit = one logical change
- ❌ Do not mix unrelated changes in one commit