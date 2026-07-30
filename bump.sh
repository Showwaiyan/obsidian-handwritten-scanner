#!/usr/bin/env bash
set -e

# Usage:
#   ./bump.sh 1.2.5
#
# This will:
#   - bump package.json to 1.2.5
#   - run version-bump.mjs (updates manifest.json + versions.json)
#   - rebuild the plugin (main.js)
#   - commit all changes
#   - create a git tag (1.2.5)
#   - push commit + tag to GitHub

VERSION="$1"

if [ -z "$VERSION" ]; then
  echo "Error: No version provided."
  echo "Usage: ./bump.sh 1.2.5"
  exit 1
fi

echo "🔧 Bumping version to $VERSION"

# 1. Update package.json
npm version "$VERSION" --no-git-tag-version

# 2. Run your Node bump script (updates manifest.json + versions.json)
npm run version

# 3. Build the plugin
echo "📦 Building plugin..."
npm run build

# 4. Commit changes
echo "Enter commit message:"
read MESSAGE
git add package.json manifest.json versions.json main.js
git commit -m "Release $VERSION: $MESSAGE"

# 5. Create tag without 'v' prefix
git tag "$VERSION"

# 6. Push commit + tag
echo "🚀 Pushing to GitHub..."
git push
git push origin "$VERSION"

# 7. Create GitHub release with attached files
echo "📦 Creating GitHub release..."
gh release create "$VERSION" \
  --title "$VERSION" \
  --notes "Release $VERSION" \
  main.js \
  manifest.json \
  styles.css

echo "✅ Version bump complete: $VERSION"
echo "✅ GitHub release published: https://github.com/jzstoller/obsidian-scan-sketch/releases/tag/$VERSION"
