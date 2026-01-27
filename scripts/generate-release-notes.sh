#!/bin/bash

# Get the current version from package.json
CURRENT_VERSION=$1

# Get the previous tag
PREVIOUS_TAG=$(git describe --tags --abbrev=0 HEAD^ 2>/dev/null || echo "")

if [ -z "$PREVIOUS_TAG" ]; then
  # First release, show all commits
  npx auto-changelog --stdout --commit-limit false --template compact
else
  # Show only commits between previous tag and current version
  npx auto-changelog --stdout --commit-limit false --starting-version "$PREVIOUS_TAG" --ending-version "v$CURRENT_VERSION" --template compact
fi