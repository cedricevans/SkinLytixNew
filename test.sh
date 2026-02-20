#!/bin/bash

# SkinLytix MVP Test Runner
# Quick start script for testing the application

echo "🚀 SkinLytix MVP Test Suite"
echo "============================"
echo ""

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Are you in the Skinlytix root directory?"
    exit 1
fi

echo -e "${BLUE}✓ Found package.json${NC}"
echo ""

# Menu
echo "Select what you want to do:"
echo ""
echo "1) Start development server (localhost:8080)"
echo "2) Run linting checks"
echo "3) Run E2E tests with Playwright"
echo "4) Build for production"
echo "5) Preview production build"
echo "6) Verify database integrity"
echo "7) Run all checks (lint + build + tests)"
echo "8) Exit"
echo ""
read -p "Enter choice [1-8]: " choice

case $choice in
    1)
        echo -e "${YELLOW}Starting development server...${NC}"
        echo "Server will run on http://localhost:8080"
        echo "Press Ctrl+C to stop"
        npm run dev
        ;;
    2)
        echo -e "${YELLOW}Running linting checks...${NC}"
        npm run lint
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓ Linting passed!${NC}"
        else
            echo -e "❌ Linting failed. Fix errors above."
        fi
        ;;
    3)
        echo -e "${YELLOW}Running E2E tests...${NC}"
        echo "Make sure dev server is running in another terminal!"
        echo ""
        read -p "Run in headed mode? (y/n): " headed
        if [ "$headed" = "y" ] || [ "$headed" = "Y" ]; then
            npx playwright test tests/e2e.spec.ts --headed
        else
            npx playwright test tests/e2e.spec.ts
        fi
        ;;
    4)
        echo -e "${YELLOW}Building for production...${NC}"
        npm run build
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓ Build successful!${NC}"
            echo "Output in: dist/"
        else
            echo -e "❌ Build failed. Fix errors above."
        fi
        ;;
    5)
        echo -e "${YELLOW}Checking if build exists...${NC}"
        if [ ! -d "dist" ]; then
            echo "Building first..."
            npm run build
        fi
        echo -e "${YELLOW}Starting preview server...${NC}"
        echo "Preview will run on http://localhost:4173"
        echo "Press Ctrl+C to stop"
        npm run preview
        ;;
    6)
        echo -e "${YELLOW}Verifying database integrity...${NC}"
        node verify-database.js
        ;;
    7)
        echo -e "${YELLOW}Running all checks...${NC}"
        echo ""
        echo "Step 1/3: Linting..."
        npm run lint
        if [ $? -ne 0 ]; then
            echo -e "❌ Linting failed!"
            exit 1
        fi
        echo -e "${GREEN}✓ Linting passed!${NC}"
        echo ""
        
        echo "Step 2/3: Building..."
        npm run build
        if [ $? -ne 0 ]; then
            echo -e "❌ Build failed!"
            exit 1
        fi
        echo -e "${GREEN}✓ Build successful!${NC}"
        echo ""
        
        echo "Step 3/3: E2E Tests..."
        echo "Make sure dev server is running! (npm run dev in another terminal)"
        read -p "Press Enter when dev server is ready..."
        npx playwright test tests/e2e.spec.ts
        
        echo ""
        echo -e "${GREEN}✓ All checks completed!${NC}"
        ;;
    8)
        echo "Goodbye!"
        exit 0
        ;;
    *)
        echo "❌ Invalid choice. Please enter 1-8."
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}Done!${NC}"
