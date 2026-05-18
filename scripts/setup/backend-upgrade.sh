#!/bin/bash
# Backend Upgrade Script - ISP Entertainment Portal
# This script automates the backend upgrade process

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Main upgrade process
main() {
    print_header "ISP Entertainment Portal - Backend Upgrade"
    
    # Check if backend directory exists
    if [ ! -d "backend" ]; then
        print_error "backend directory not found!"
        exit 1
    fi
    
    cd backend
    
    print_header "Step 1: Backing up current state"
    if [ -f "package-lock.json" ]; then
        cp package-lock.json package-lock.json.backup
        print_success "Backed up package-lock.json"
    else
        print_warning "No package-lock.json found"
    fi
    
    print_header "Step 2: Updating dependencies"
    
    echo "Updating production dependencies..."
    npm install express@^4.21.2 \
        dotenv@^17.4.2 \
        helmet@^8.1.0 \
        joi@^18.1.2 \
        jsonwebtoken@^9.0.3 \
        --save
    
    print_success "Production dependencies updated"
    
    echo "Updating dev dependencies..."
    npm install nodemon@latest --save-dev
    
    print_success "Dev dependencies updated"
    
    print_header "Step 3: Checking for vulnerabilities"
    
    if npm audit 2>/dev/null; then
        print_success "No vulnerabilities found"
    else
        print_warning "Some vulnerabilities detected"
        echo "Running npm audit fix..."
        npm audit fix || true
    fi
    
    print_header "Step 4: Running tests"
    
    if npm test 2>/dev/null; then
        print_success "All tests passed"
    else
        print_warning "Some tests failed - review manually"
    fi
    
    print_header "Step 5: Checking code quality"
    
    # Check if .eslintrc exists
    if [ -f ".eslintrc.json" ]; then
        echo "ESLint configuration found"
        # npm run lint || print_warning "ESLint checks failed"
    else
        print_warning "No ESLint configuration found"
    fi
    
    print_header "Summary"
    
    print_success "Backend upgrade completed!"
    echo ""
    echo "Next steps:"
    echo "1. Review changes: git status"
    echo "2. Test locally: npm run dev"
    echo "3. Run all tests: npm test"
    echo "4. Create PR for review"
    echo ""
    
    # Show version info
    echo "Installed versions:"
    npm list --depth=0 2>/dev/null | head -20 || true
    
    cd ..
}

# Run main function
main "$@"
