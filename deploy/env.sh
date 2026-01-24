#!/bin/bash

# ANSI color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

log_info() { printf "${GREEN}✓ %s${NC}\n" "$1"; }
log_warn() { printf "${YELLOW}⚠ %s${NC}\n" "$1"; }
log_error() { printf "${RED}✗ %s${NC}\n" "$1"; }

# Get the directory of this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ROOT_DIR="$( dirname "$SCRIPT_DIR" )"

cd "$ROOT_DIR" || exit

# ========================================
# STOP EXISTING PROCESSES
# ========================================
echo "Stopping existing frontend services..."
ports=(7200 7600 7800)
for port in "${ports[@]}"; do
    pid=$(lsof -ti:$port 2>/dev/null)
    if [ -n "$pid" ]; then
        echo "  Cleaning port $port: $pid"
        kill -9 $pid 2>/dev/null
    fi
done

# ========================================
# START FRONTEND SERVICES
# ========================================
echo ""
echo "Starting frontend services..."

# 1. Portal System (7200)
echo "Starting Portal System (7200)..."
(cd portal/system && nohup npm run dev > /dev/null 2>&1 &)

# 2. Portal Operator (7600)
echo "Starting Portal Operator (7600)..."
(cd portal/operator && nohup npm run dev > /dev/null 2>&1 &)

# 3. Client Mobile (7800)
echo "Starting Client Mobile (7800)..."
(cd client/mobile && nohup npm run dev > /dev/null 2>&1 &)

echo "Waiting for services to initialize..."
sleep 5

# ========================================
# HEALTH CHECK
# ========================================
echo ""
echo "Checking service health..."
failed=0

services=(
    "Portal System|7200"
    "Portal Operator|7600"
    "Client Mobile|7800"
)

for service in "${services[@]}"; do
    name="${service%|*}"
    port="${service#*|}"
    
    printf "Checking %-20s (Port %5s)..." "$name" "$port"
    
    # Simple port check
    if lsof -i:$port -sTCP:LISTEN &> /dev/null; then
        printf " ${GREEN}✓ Running${NC}\n"
    else
        printf " ${RED}✗ Failed${NC}\n"
        ((failed++))
    fi
done

echo "========================="
if [ $failed -eq 0 ]; then
    log_info "All frontend environments active!"
    echo "  System:   http://localhost:7200"
    echo "  Operator: http://localhost:7600"
    echo "  Mobile:   http://localhost:7800"
else
    log_warn "$failed service(s) failed to start."
fi
