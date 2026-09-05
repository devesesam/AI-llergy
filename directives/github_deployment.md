# Directive: GitHub Deployment & Workflow

**Goal**: Document the correct procedures for version control and deployment of the AI-llergy project, specifically addressing the unique workspace structure and known environment issues.

## 1. Workspace Structure — THREE repos, all legitimate

> **This is intentional, not a mistake.** New agents (and the owner) often think the extra
> repos are an accident — they aren't. There are separate GitHub repos under `devesesam`,
> each with a distinct job. When asked to "push all changes", push the relevant **nested**
> app repo **and** the outer backup repo.

| Repo | Location | Branch | Contains | Role |
|---|---|---|---|---|
| **`devesesam/ai-llergy-webapp`** | nested `ai-llergy-webapp/.git` | **`master`** | The allergen-filter Next.js app (`src/`, etc.) | **Netlify deploys this** → menukey.co.nz |
| **`devesesam/set-menu-builder`** | nested `set-menu-builder/.git` | **`master`** | The Set Menu Builder Next.js app (separate product, shares the same Google Sheet) | **Netlify deploys this** → set.menukey.co.nz |
| **`devesesam/AI-llergy`** | workspace root `.git` | **`workspace`** | `directives/`, `execution/` scripts, `resources/` (Tom's spreadsheets, allergen master PDFs), `archive/` (retired code + old data snapshots), `CLAUDE.md`. **Both app folders are gitignored here** (`ai-llergy-webapp/`, `set-menu-builder/`) — each lives only in its own nested repo; never `git add` them into the outer repo. | Docs/scripts/data; **NOT deployed** |

- **Deploy an allergen-app change** → commit + push the **`ai-llergy-webapp`** nested repo's `master`.
- **Deploy a set-menu-builder change** → commit + push the **`set-menu-builder`** nested repo's `master`.
- **Back up docs/scripts/data** → commit + push the **outer** repo's `workspace`.
- Until 2026-09-05 the outer repo also tracked a *copy* of the `ai-llergy-webapp/` files. That copy was removed
  (Sam's decision) because it deployed nothing, drifted between manual syncs, and masked the nesting. Deploys were
  verified via `netlify sites:list`: menukey.co.nz ← `devesesam/ai-llergy-webapp`, set.menukey.co.nz ←
  `devesesam/set-menu-builder`; the outer repo is linked to no Netlify site.
- Each nested app is independent: a code change in one does NOT redeploy the other.
- The outer repo's history goes back to Feb 2026, all authored by the owner. It is *their* repo, not
  something an agent created.
- `.env.local` is gitignored in **both** app repos — never commit it (holds `GOOGLE_SHEET_ID` + the Anthropic key).
- **Important**: the webapp is a **nested repository** (its own `.git` inside the outer repo).

---

## 2. Standard Deployment Workflow

**Context**: You are adding features or fixing bugs in the web application (e.g., `src/` files).

### Step 1: Navigate to the Webapp Directory
**CRITICAL**: You must be in the `ai-llergy-webapp` directory to push code changes for the app.
```powershell
cd ai-llergy-webapp
```

### Step 2: Verify Remote
**CRITICAL**: Ensure you are pushing to the correct repository. The result of `git remote -v` MUST match `ai-llergy-webapp`.
```powershell
git remote -v
# Should show: https://github.com/devesesam/ai-llergy-webapp.git
```
**IF IT SHOWS** `AI-llergy.git` (the root repo), YOU ARE IN THE WRONG DIRECTORY. `cd ai-llergy-webapp` immediately.

### Step 3: Stage and Commit
```powershell
git add .
git commit -m "feat: description of changes"
```

### Step 4: Push
```powershell
git push origin master
```

---

## 3. Known Issues & Workarounds

### Issue 1: The `nul` File (Windows) — RESOLVED 2026-09-05
A zero-byte file literally named `nul` (a reserved Windows device name) sat in the workspace root for months; `del`,
`rm` and Explorer all fail on it and `git add .` at the root errored with `invalid path 'nul'`. It was finally deleted
with .NET's extended-length path syntax from PowerShell:
```powershell
[System.IO.File]::Delete('\?\C:\<abs path to workspace>
ul')
```
If it ever reappears (a non-Windows tool redirecting to `nul`), use the same command. Do not add `nul` to `.gitignore`
as a workaround — delete it.

### Issue 2: Nested Submodule Conflicts
**Symptoms**:
*   `git status` in the root shows `ai-llergy-webapp` as an untracked folder or a submodule.
*   Warnings about "adding embedded git repository".

**Cause**: The folder `ai-llergy-webapp` is a fully initialized git repo inside another git repo.

**Current reality**:
*   Treat them as separate entities. **Deploy work**: commit + push the nested app repo's `master`.
*   **Docs/data**: commit + push the root repo (`workspace`).
*   Both app folders are in the root `.gitignore`, so root `git status` no longer lists them at all. Do not convert them to
    submodules and do not remove them from `.gitignore` without the owner asking.

### Issue 3: PowerShell Operator Conflicts
**Symptoms**:
*   Commands like `git add . && git commit...` fail with `The token '&&' is not a valid statement separator`.

**Cause**: Windows PowerShell uses `;` as a separator, not `&&` (unless using newer PowerShell 7+ features or CMD).

**Fix**:
*   Use `;` to separate commands: `git add . ; git commit -m "msg" ; git push`
*   Or run commands sequentially in separate steps.

---

## 4. Best Practices for Future Agents

1.  **Check Your PWD**: Always run `pwd` or look at the prompt to know if you are in the root or the webapp folder.
2.  **Targeted Commits**: In the root workspace, prefer `git add directives/ execution/ resources/ archive/ CLAUDE.md` over `git add .`.
3.  **Status Check**: Run `git status` before adding to see what unwanted files (like `nul` or `tmp/`) might be lurking.
