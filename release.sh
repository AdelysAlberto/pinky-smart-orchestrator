#!/usr/bin/env bash

set -e

TYPE="${1:-patch}"

if [[ "$TYPE" != "patch" && "$TYPE" != "minor" && "$TYPE" != "major" ]]; then
    echo "Error: Tipo de version invalido: $TYPE"
    echo "Uso: ./release.sh [patch|minor|major]"
    exit 1
fi

# Obtener ultima tag de git
LATEST_TAG="$(git describe --tags --abbrev=0 2>/dev/null || echo "v1.0.0")"
VERSION="${LATEST_TAG#v}"

IFS='.' read -r MAJOR MINOR PATCH <<< "$VERSION"

case "$TYPE" in
    patch)
        PATCH=$((PATCH + 1))
        ;;
    minor)
        MINOR=$((MINOR + 1))
        PATCH=0
        ;;
    major)
        MAJOR=$((MAJOR + 1))
        MINOR=0
        PATCH=0
        ;;
esac

NEW_TAG="v${MAJOR}.${MINOR}.${PATCH}"
NEW_VERSION="${MAJOR}.${MINOR}.${PATCH}"

echo "Incrementando version: ${LATEST_TAG} -> ${NEW_TAG}"

# 1. Update orchestrator/__init__.py
python3 -c "
with open('orchestrator/__init__.py', 'r') as f:
    content = f.read()
import re
updated = re.sub(r'__version__\s*=\s*[\"\'][^\"\']+[\"\']', f'__version__ = \"${NEW_VERSION}\"', content)
with open('orchestrator/__init__.py', 'w') as f:
    f.write(updated)
"

# 2. Update pyproject.toml
python3 -c "
with open('pyproject.toml', 'r') as f:
    content = f.read()
import re
updated = re.sub(r'version\s*=\s*[\"\'][^\"\']+[\"\']', f'version = \"${NEW_VERSION}\"', content, count=1)
with open('pyproject.toml', 'w') as f:
    f.write(updated)
"

# 3. Commit changes
git add orchestrator/__init__.py pyproject.toml
if [[ -n $(git status --porcelain) ]]; then
    git add .
    git commit -m "chore: release ${NEW_TAG}"
fi

# 4. Create git tag
echo "Creando git tag ${NEW_TAG}..."
git tag -a "${NEW_TAG}" -m "Release ${NEW_TAG}"

# 5. Push to GitHub
echo "Subiendo cambios y tag a GitHub..."
git push origin main
git push origin "${NEW_TAG}"

# 6. Create GitHub Release with gh CLI if available
if command -v gh &>/dev/null; then
    echo "Creando Release en GitHub..."
    gh release create "${NEW_TAG}" --title "${NEW_TAG}" --notes "Release ${NEW_TAG} of Pinky Smart Orchestrator" || true
fi

echo "Release ${NEW_TAG} publicado con exito."
