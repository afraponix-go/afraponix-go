#!/bin/bash

# Afraponix Go - Quick Commit Script
# Commits latest changes with proper formatting and attribution

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Afraponix Go - Commit Latest Changes${NC}"
echo "=================================================="

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo -e "${RED}❌ Error: Not in a git repository${NC}"
    exit 1
fi

# Check git status
echo -e "${YELLOW}📋 Checking git status...${NC}"
git status --short

# Check if there are any changes
if git diff-index --quiet HEAD --; then
    echo -e "${GREEN}✅ No changes to commit${NC}"
    exit 0
fi

# Prompt for commit message
echo ""
echo -e "${BLUE}💭 Enter commit message (or press Enter for interactive mode):${NC}"
read -r commit_message

if [ -z "$commit_message" ]; then
    echo ""
    echo -e "${YELLOW}📝 Interactive commit mode - please provide details:${NC}"
    echo "Enter a brief title for your changes:"
    read -r title
    
    echo ""
    echo "Enter a detailed description (optional, press Enter to skip):"
    read -r description
    
    echo ""
    echo "What type of change is this?"
    echo "1) 🐛 Bug fix"
    echo "2) ✨ New feature"
    echo "3) 🎨 UI/UX improvement"
    echo "4) 🔧 Technical improvement"
    echo "5) 📖 Documentation"
    echo "6) 🚀 Performance improvement"
    echo "7) 🧹 Code cleanup/refactoring"
    read -r change_type
    
    case $change_type in
        1) type_prefix="🐛 Fix:" ;;
        2) type_prefix="✨ Add:" ;;
        3) type_prefix="🎨 Enhance:" ;;
        4) type_prefix="🔧 Improve:" ;;
        5) type_prefix="📖 Update:" ;;
        6) type_prefix="🚀 Optimize:" ;;
        7) type_prefix="🧹 Refactor:" ;;
        *) type_prefix="🔄 Update:" ;;
    esac
    
    # Build commit message
    if [ -n "$description" ]; then
        commit_message="$type_prefix $title

$description

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"
    else
        commit_message="$type_prefix $title

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"
    fi
fi

# Show what will be committed
echo ""
echo -e "${YELLOW}📦 Files to be committed:${NC}"
git diff --cached --name-status 2>/dev/null || git diff --name-status

# Add all changes
echo ""
echo -e "${YELLOW}📥 Adding all changes...${NC}"
git add .

# Exclude production files if they exist
if [ -f ".env.production" ] || [ -f "deploy-production.sh" ] || [ -f "setup-production-ssl.sh" ]; then
    echo -e "${YELLOW}🔒 Excluding production files from commit...${NC}"
    git reset HEAD .env.production 2>/dev/null || true
    git reset HEAD deploy-production.sh 2>/dev/null || true
    git reset HEAD setup-production-ssl.sh 2>/dev/null || true
fi

# Show final status
echo ""
echo -e "${YELLOW}📋 Final commit status:${NC}"
git status --short

# Confirm commit
echo ""
echo -e "${BLUE}📝 Commit message:${NC}"
echo "----------------------------------------"
echo "$commit_message"
echo "----------------------------------------"

echo ""
echo -e "${YELLOW}❓ Proceed with commit? (y/N):${NC}"
read -r confirm

if [[ $confirm =~ ^[Yy]$ ]]; then
    # Commit changes
    echo ""
    echo -e "${YELLOW}💾 Committing changes...${NC}"
    git commit -m "$commit_message"
    
    # Show commit info
    echo ""
    echo -e "${GREEN}✅ Commit successful!${NC}"
    git log --oneline -1
    
    # Ask about pushing
    echo ""
    echo -e "${YELLOW}❓ Push to remote repository? (y/N):${NC}"
    read -r push_confirm
    
    if [[ $push_confirm =~ ^[Yy]$ ]]; then
        echo ""
        echo -e "${YELLOW}🚀 Pushing to remote...${NC}"
        git push
        echo -e "${GREEN}✅ Successfully pushed to remote repository!${NC}"
    else
        echo -e "${BLUE}📝 Changes committed locally. Run 'git push' when ready to push to remote.${NC}"
    fi
else
    echo -e "${RED}❌ Commit cancelled${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 Done!${NC}"