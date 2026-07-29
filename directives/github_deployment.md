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
| **`devesesam/AI-llergy`** | workspace root `.git` | **`workspace`** | `directives/`, `execution/` scripts, CSVs/PDFs/data (`resources/`), **and a tracked copy of the `ai-llergy-webapp/` files**. **`set-menu-builder/` is NOT tracked here** — it lives only in its own repo, shown as `?? set-menu-builder/` (untracked); do **not** `git add` it into the outer repo (nested-repo/submodule mess). | Full-project backup; **NOT deployed** |

- **Deploy an allergen-app change** → commit + push the **`ai-llergy-webapp`** nested repo's `master`.
- **Deploy a set-menu-builder change** → commit + push the **`set-menu-builder`** nested repo's `master`.
- **Back up docs/scripts/data** → commit + push the **outer** repo's `workspace`. (It also tracks a copy
  of the `ai-llergy-webapp/` files, which is why `git status` at the root shows those app files as
  "modified" — that overlap is what masks the nesting and confuses people. `set-menu-builder/` is
  **untracked** here — it has no outer copy; back it up via its own repo only.)
- Each nested app is independent: a code change in one does NOT redeploy the other.
- The outer repo's history goes back to Feb 2026, all authored by the owner. It is *their* repo, not
  something an agent created.
- `.env.local` is gitignored in **both** repos — never commit it (holds the Anthropic + Supabase keys).
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

### Issue 1: The `nul` File (Windows)
**Symptoms**:
*   `git add .` in the **root** workspace fails with `error: invalid path 'nul'`.
*   `del nul` fails with "ItemNotFoundException".

**Cause**: `nul` is a reserved device name in Windows (like `/dev/null` in Unix). A file named `nul` was somehow created (likely by a script or tool from a non-Windows environment), and Windows file APIs cannot handle it normally. It acts as a ghost file.

**Workaround**:
*   **Do not use** `git add .` in the root workspace if it tries to include `nul`.
*   Add `nul` to `.gitignore` in the root (already done, but git might still track it if it was previously there).
*   If you must commit the root, explicitly stage specific files/folders (e.g., `git add directives/`) instead of checking in everything.

### Issue 2: Nested Submodule Conflicts
**Symptoms**:
*   `git status` in the root shows `ai-llergy-webapp` as an untracked folder or a submodule.
*   Warnings about "adding embedded git repository".

**Cause**: The folder `ai-llergy-webapp` is a fully initialized git repo inside another git repo.

**Current reality (do not "fix" this without the owner's say-so)**:
*   Treat them as separate entities.
*   **Deploy work**: commit + push `ai-llergy-webapp` (`master`) — only this updates the live site.
*   **Docs/data**: commit + push the root repo (`workspace`).
*   The root repo **currently tracks a copy** of the `ai-llergy-webapp/` files (it is NOT gitignored and
    NOT a submodule). That overlap is intentional-enough as a backup — pushing both keeps them in sync.
    Don't add `ai-llergy-webapp/` to the root `.gitignore` or convert it to a submodule unless the owner
    explicitly asks to consolidate; doing so silently would drop the webapp copy from the backup repo.

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
2.  **Targeted Commits**: In the root workspace, avoid `git add .`. Instead, `git add directives/` or `git add AGENTS.md` to update documentation without tripping over the `nul` file or nested repos.
3.  **Status Check**: Run `git status` before adding to see what unwanted files (like `nul` or `tmp/`) might be lurking.
