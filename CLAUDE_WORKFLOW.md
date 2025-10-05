# 🤖 Claude Auto-Backup Workflow

## Automated Versioning by Claude

Claude will **automatically** create a new GitHub version after every change session.

## Standard Workflow

### After Making Changes:

1. ✅ **Make the code changes** (edit, add, or modify files)
2. ✅ **Automatically bump version** using semantic versioning
3. ✅ **Commit with descriptive message** including version
4. ✅ **Create git tag** for the version
5. ✅ **Push to both GitHub repos** (origin + aipm)

### Version Decision Logic:

- **Patch (x.x.X)** - Bug fixes, minor changes, documentation
- **Minor (x.X.0)** - New features, enhancements, new functionality
- **Major (X.0.0)** - Breaking changes, major refactoring, schema changes

## Commands Claude Will Use

```bash
# 1. Bump version
npm version [patch|minor|major] --no-git-tag-version

# 2. Stage and commit
git add .
git commit -m "Description (vX.X.X)"

# 3. Create tag
git tag -a vX.X.X -m "Release vX.X.X: Description"

# 4. Push to both remotes
git push origin test-aipm
git push origin --tags
git push aipm test-aipm:master
git push aipm --tags
```

## Current Configuration

- **Branch:** test-aipm
- **Remotes:**
  - origin → https://github.com/deepaksx/statuz.git
  - aipm → https://github.com/deepaksx/AIPM.git
- **Auto-backup:** ✅ Enabled
- **Version:** 2.4.3

## Examples

### Bug Fix (Patch)
```
Files changed: parser-agent.ts
Version: 2.4.3 → 2.4.4
Commit: "Fix JSON parsing in parser agent (v2.4.4)"
Tag: v2.4.4
```

### New Feature (Minor)
```
Files changed: Multiple files
Version: 2.4.3 → 2.5.0
Commit: "Add PDF export functionality (v2.5.0)"
Tag: v2.5.0
```

### Breaking Change (Major)
```
Files changed: Database schema + multiple
Version: 2.4.3 → 3.0.0
Commit: "Redesign database architecture (v3.0.0)"
Tag: v3.0.0
```

## User Expectations

✅ **User does NOT need to run any scripts**
✅ **Claude handles all versioning automatically**
✅ **Every change session gets a new version**
✅ **Both GitHub repos stay in sync**
✅ **Full version history with tags**

## Verification

After Claude makes changes, user can verify:

```bash
# Check latest version
git describe --tags

# View recent commits
git log -3 --oneline --decorate

# See version in package.json
cat package.json | grep version
```

---

**Status:** Active and automated ✅
