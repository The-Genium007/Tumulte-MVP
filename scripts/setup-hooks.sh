#!/bin/bash
# Setup git hooks for the project
# Run this once after cloning the repository

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
HOOKS_DIR="$ROOT_DIR/.git/hooks"

echo "Setting up git hooks..."

# Create pre-commit hook
cat > "$HOOKS_DIR/pre-commit" << 'EOF'
#!/bin/bash
# Pre-commit hook: verify lock files are in sync

# Only check if package.json or package-lock.json are staged
STAGED_FILES=$(git diff --cached --name-only)

if echo "$STAGED_FILES" | grep -qE "(backend|frontend)/package\.json"; then
    # Check if corresponding lock file is also staged
    if echo "$STAGED_FILES" | grep -q "backend/package.json"; then
        if ! echo "$STAGED_FILES" | grep -q "backend/package-lock.json"; then
            echo "ERROR: backend/package.json is staged but package-lock.json is not!"
            echo "Run: cd backend && npm install"
            echo "Then stage the lock file: git add backend/package-lock.json"
            exit 1
        fi
    fi

    if echo "$STAGED_FILES" | grep -q "frontend/package.json"; then
        if ! echo "$STAGED_FILES" | grep -q "frontend/package-lock.json"; then
            echo "ERROR: frontend/package.json is staged but package-lock.json is not!"
            echo "Run: cd frontend && npm install"
            echo "Then stage the lock file: git add frontend/package-lock.json"
            exit 1
        fi
    fi
fi

exit 0
EOF

chmod +x "$HOOKS_DIR/pre-commit"

echo "Git hooks installed successfully!"
echo ""
echo "The pre-commit hook will now verify that package-lock.json"
echo "files are staged when package.json is modified."
