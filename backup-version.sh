#!/bin/bash
# Automated Version Backup Script for Statuz
# Usage: ./backup-version.sh [patch|minor|major] "commit message"

# Default to patch if not specified
VERSION_TYPE=${1:-patch}
COMMIT_MSG="$2"

if [ -z "$COMMIT_MSG" ]; then
    echo "ERROR: Commit message required"
    echo "Usage: ./backup-version.sh [patch|minor|major] \"commit message\""
    exit 1
fi

echo "========================================"
echo "Statuz Automated Version Backup"
echo "========================================"
echo ""

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo "📝 Found uncommitted changes"
else
    echo "ℹ️  No changes to commit"
    read -p "Continue anyway to create new version? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 0
    fi
fi

echo ""
echo "🔢 Bumping version ($VERSION_TYPE)..."
npm version $VERSION_TYPE --no-git-tag-version

# Get new version from package.json
NEW_VERSION=$(node -p "require('./package.json').version")
echo "✅ New version: $NEW_VERSION"
echo ""

# Stage all changes
echo "📦 Staging all changes..."
git add .

# Commit changes
echo "💾 Committing changes..."
git commit -m "$COMMIT_MSG (v$NEW_VERSION)"

# Create git tag
echo "🏷️  Creating git tag..."
git tag -a "v$NEW_VERSION" -m "Release v$NEW_VERSION: $COMMIT_MSG"

# Push to origin (statuz repo)
echo "📤 Pushing to origin (statuz)..."
git push origin test-aipm
git push origin --tags

# Push to aipm repo
echo "📤 Pushing to aipm..."
git push aipm test-aipm:master
git push aipm --tags

echo ""
echo "========================================"
echo "✅ Backup Complete!"
echo "========================================"
echo "Version: v$NEW_VERSION"
echo "Branch: test-aipm"
echo "Remotes: origin + aipm"
echo "Tag: v$NEW_VERSION"
echo "========================================"
