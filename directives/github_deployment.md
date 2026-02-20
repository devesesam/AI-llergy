# Directive: GitHub Deployment & Workflow

**Goal**: Document the correct procedures for version control and deployment of the AI-llergy project, specifically addressing the unique workspace structure and known environment issues.

## 1. Workspace Structure

The workspace contains two distinct layers of version control:

1.  **Root Workspace** (`.../AI-llergy`):
    *   Contains documentation (`directives/`), older prototypes (`ai-llergy-app`), and the main web application folder.
    *   **Repo**: `https://github.com/devesesam/AI-llergy`
    *   **Status**: Primarily for documentation and backup of the entire project context.
    *   **Known Issue**: Contains a phantom `nul` file (see Section 3).

2.  **Web Application** (`.../AI-llergy/ai-llergy-webapp`):
    *   Contains the Next.js/React source code for the active product.
    *   **Repo**: `https://github.com/devesesam/ai-llergy-webapp`
    *   **Status**: Active development repository. This is what deploys to Vercel/Netlify.
    *   **Important**: This is a **nested repository**. It has its own `.git` folder.

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

**Workflow**:
*   Treat them as separate entities.
*   **Primary Work**: Focus on `ai-llergy-webapp`. Push changes there.
*   **Backup/Docs**: If updating directives in the root, you can push the root repo, but **ignore** the `ai-llergy-webapp` folder in the root's `.gitignore` to avoid submodule complexity, OR commit it as a submodule reference if intended.
*   **Recommendation**: Just ignore the webapp folder in the root repo to prevent "dirty submodule" states.

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
