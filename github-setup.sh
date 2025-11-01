#!/bin/bash

# GitHub Repository Setup Script
# This script helps you quickly set up your GitHub repository and CI/CD

set -e

echo "🚀 MGNREGA Dashboard - GitHub CI/CD Setup"
echo "=========================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    print_error "GitHub CLI (gh) is not installed"
    print_info "Install it from: https://cli.github.com/"
    print_info "Or on macOS: brew install gh"
    exit 1
fi

print_success "GitHub CLI is installed"

# Check if already logged in
if ! gh auth status &> /dev/null; then
    print_info "Please login to GitHub..."
    gh auth login
fi

print_success "Authenticated with GitHub"

# Get repository details
print_info "Repository setup..."
echo ""
read -p "Enter repository name (default: mgnrega-dashboard-haryana): " REPO_NAME
REPO_NAME=${REPO_NAME:-mgnrega-dashboard-haryana}

read -p "Make repository public? (y/n, default: y): " IS_PUBLIC
IS_PUBLIC=${IS_PUBLIC:-y}

if [[ $IS_PUBLIC =~ ^[Yy]$ ]]; then
    VISIBILITY="--public"
else
    VISIBILITY="--private"
fi

# Initialize git if needed
if [ ! -d .git ]; then
    print_info "Initializing git repository..."
    git init
    print_success "Git initialized"
fi

# Create .gitignore if not exists
if [ ! -f .gitignore ]; then
    print_info "Creating .gitignore..."
    cat > .gitignore << 'EOF'
# Dependencies
node_modules/
npm-debug.log*

# Production
.next/
out/
dist/

# Environment files
.env
.env*.local
.env.production

# Database
postgres_data/
*.db

# IDE
.vscode/
.idea/
.DS_Store

# Logs
*.log

# Docker
postgres_data/

# Misc
.turbo
.eslintcache
EOF
    print_success ".gitignore created"
fi

# Add all files
print_info "Adding files to git..."
git add .

# Create initial commit
if ! git log &> /dev/null; then
    print_info "Creating initial commit..."
    git commit -m "Initial commit: MGNREGA Dashboard Haryana

Features:
- Next.js 16 with TypeScript
- PostgreSQL with Prisma ORM
- Bilingual UI (Hindi + English)
- 22 Haryana districts tracking
- Docker containerization
- GitHub Actions CI/CD
- Azure deployment ready"
    print_success "Initial commit created"
else
    print_info "Repository already has commits"
fi

# Create GitHub repository
print_info "Creating GitHub repository..."
if gh repo create "$REPO_NAME" $VISIBILITY --source=. --remote=origin --description "MGNREGA Dashboard for Haryana - Track rural employment program performance" 2>/dev/null; then
    print_success "GitHub repository created: $REPO_NAME"
else
    print_info "Repository might already exist, continuing..."
fi

# Push to GitHub
print_info "Pushing to GitHub..."
git branch -M main
git push -u origin main 2>/dev/null || git push origin main
print_success "Code pushed to GitHub"

# Get repository URL
REPO_URL=$(gh repo view --json url -q .url)
print_success "Repository URL: $REPO_URL"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
print_success "GitHub repository setup complete!"
echo ""
print_info "Next steps:"
echo ""
echo "1. Configure GitHub Secrets:"
echo "   Go to: $REPO_URL/settings/secrets/actions"
echo ""
echo "   Add these secrets:"
echo "   - AZURE_VM_IP          (Your Azure VM public IP)"
echo "   - AZURE_SSH_USER       (Usually 'azureuser')"
echo "   - AZURE_SSH_PRIVATE_KEY (Your SSH private key)"
echo "   - DATABASE_URL         (PostgreSQL connection string)"
echo "   - DATA_GOV_API_KEY     (Your data.gov.in API key)"
echo "   - NEXT_PUBLIC_APP_URL  (Your app URL)"
echo ""
echo "2. Create Azure VM (if not done already):"
echo "   - Size: Standard B2s (2 vCPU, 4GB RAM)"
echo "   - OS: Ubuntu 22.04 LTS"
echo "   - Ports: 22, 80, 443"
echo ""
echo "3. Push code to trigger deployment:"
echo "   git push origin main"
echo ""
echo "📖 Detailed guide: GITHUB_CICD_SETUP.md"
echo ""
print_info "View your repository:"
echo "   $REPO_URL"
echo ""
print_info "View GitHub Actions:"
echo "   $REPO_URL/actions"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

