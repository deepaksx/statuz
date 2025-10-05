# 📦 Statuz Automated Backup Guide

## Overview

Every change to Statuz is automatically versioned and backed up to GitHub with proper semantic versioning.

## Quick Start

### Windows
```bash
backup-version.bat patch "Your commit message here"
```

### Mac/Linux
```bash
chmod +x backup-version.sh
./backup-version.sh patch "Your commit message here"
```

## Version Types

Choose the appropriate version bump based on your changes:

### `patch` (2.4.2 → 2.4.3)
Use for bug fixes and minor changes:
```bash
backup-version.bat patch "Fix auto-response trigger bug"
```

**Examples:**
- Bug fixes
- Typo corrections
- Performance improvements
- Documentation updates

### `minor` (2.4.2 → 2.5.0)
Use for new features (backward compatible):
```bash
backup-version.bat minor "Add export to PDF feature"
```

**Examples:**
- New features
- New API endpoints
- Enhanced functionality
- UI improvements

### `major` (2.4.2 → 3.0.0)
Use for breaking changes:
```bash
backup-version.bat major "Redesign database schema"
```

**Examples:**
- Breaking API changes
- Database schema changes requiring migration
- Major architectural changes
- Removal of deprecated features

## What the Script Does

1. ✅ **Checks for changes** - Warns if nothing to commit
2. 🔢 **Bumps version** - Updates `package.json` automatically
3. 📦 **Stages all files** - `git add .`
4. 💾 **Creates commit** - With your message + version number
5. 🏷️ **Creates git tag** - Tags the release (e.g., `v2.4.3`)
6. 📤 **Pushes to GitHub** - Pushes to both remotes:
   - `origin` → `test-aipm` branch
   - `aipm` → `master` branch
7. 📤 **Pushes tags** - Makes version tags available on GitHub

## GitHub Remotes

This project has two remotes:

- **origin:** https://github.com/deepaksx/statuz.git
- **aipm:** https://github.com/deepaksx/AIPM.git

Both are updated automatically with each backup.

## Manual Workflow (Alternative)

If you prefer manual control:

```bash
# 1. Make your changes
# ... edit files ...

# 2. Bump version manually
npm version patch   # or minor, or major

# 3. Get the new version
# (it's in package.json)

# 4. Commit everything
git add .
git commit -m "Your message (v2.4.3)"

# 5. Create tag
git tag -a v2.4.3 -m "Release v2.4.3: Your message"

# 6. Push to both remotes
git push origin test-aipm
git push origin --tags
git push aipm test-aipm:master
git push aipm --tags
```

## Version History

All versions are tracked in:
- **Git tags** - `git tag -l`
- **CHANGELOG.md** - Manual changelog entries
- **GitHub Releases** - Create releases from tags

## View All Versions

```bash
# List all version tags
git tag -l

# Show latest version
git describe --tags --abbrev=0

# View version history
git log --oneline --decorate --tags
```

## Create GitHub Release

After backing up, create a GitHub release:

1. Go to https://github.com/deepaksx/AIPM/releases
2. Click "Draft a new release"
3. Select your tag (e.g., `v2.4.3`)
4. Add release notes from CHANGELOG.md
5. Publish release

## Rollback to Previous Version

If you need to rollback:

```bash
# List available versions
git tag -l

# Checkout specific version
git checkout v2.4.2

# Or revert to previous version
git revert HEAD
npm version patch -m "Revert to previous version"
```

## Best Practices

1. ✅ **Always write clear commit messages**
   - Bad: "Fixed stuff"
   - Good: "Fix auto-response not triggering for groups with context"

2. ✅ **Use appropriate version bumps**
   - Patch: Small fixes
   - Minor: New features
   - Major: Breaking changes

3. ✅ **Update CHANGELOG.md manually**
   - The script doesn't auto-update the changelog
   - Add entries manually for major releases

4. ✅ **Test before backing up**
   - Run `npm run build`
   - Run `npm test` (if tests exist)
   - Manually test the app

5. ✅ **Commit related changes together**
   - Group related changes in one backup
   - Don't mix unrelated features

## Automated Backups on Every Change

If you want to backup **every single change** automatically, add this to your workflow:

### After Every Edit Session
```bash
# Make changes
# ... edit files ...

# Quick backup
backup-version.bat patch "Work in progress - [description]"
```

### Daily Backup
```bash
backup-version.bat patch "Daily backup - [date] - [summary]"
```

### Before Major Work
```bash
backup-version.bat patch "Checkpoint before [feature name]"
```

## CI/CD Integration (Future)

For automatic backups on every commit, set up GitHub Actions:

```yaml
# .github/workflows/auto-version.yml
name: Auto Version
on:
  push:
    branches: [test-aipm]
jobs:
  version:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Bump version
        run: npm version patch
      - name: Push tags
        run: git push --tags
```

## Troubleshooting

### "Nothing to commit"
The script will ask if you want to continue. This creates a new version without changes (useful for marking milestones).

### Push failed
```bash
# Pull latest changes first
git pull origin test-aipm
git pull aipm master

# Then try backup again
backup-version.bat patch "Your message"
```

### Wrong version bumped
```bash
# Undo last commit (keep changes)
git reset --soft HEAD~1

# Delete the tag
git tag -d v2.4.3

# Run backup again with correct version type
backup-version.bat minor "Your message"
```

## Support

- **Issues:** https://github.com/deepaksx/AIPM/issues
- **Discussions:** https://github.com/deepaksx/AIPM/discussions

---

**Last Updated:** 2025-10-05
**Current Version:** 2.4.2
