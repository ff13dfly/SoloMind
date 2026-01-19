#!/bin/bash

# ANSI color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper for colored output that works in both sh and bash
log_info() { printf "${GREEN}✓ %s${NC}\n" "$1"; }
log_warn() { printf "${YELLOW}⚠ %s${NC}\n" "$1"; }
log_error() { printf "${RED}✗ %s${NC}\n" "$1"; }

# Get the directory of this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
# Project root
ROOT_DIR="$( dirname "$SCRIPT_DIR" )"
SERVICES_JSON="$SCRIPT_DIR/services.json"

if [ ! -f "$SERVICES_JSON" ]; then
    log_error "services.json not found at $SERVICES_JSON"
    exit 1
fi

# Load services using Node.js to parse JSON
SERVICES_DATA=$(node -e "
const fs = require('fs');
const services = JSON.parse(fs.readFileSync('$SERVICES_JSON', 'utf8'));
services.forEach(s => {
    console.log([\`name=\${s.name.toUpperCase()}\`, \`path=\${s.path}\`, \`port=\${s.port}\`].join('|'));
});
")

cd "$ROOT_DIR" || exit
echo "Working directory: $(pwd)"
echo ""

# ========================================
# ENVIRONMENT PRE-CHECKS
# ========================================
echo "Checking runtime environment..."
echo "==============================="

MISSING_REQUIRED=0

# --- Check Node.js ---
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    log_info "Node.js - $NODE_VERSION"
else
    log_warn "Node.js not found. Attempting to install..."
    if command -v brew &> /dev/null; then
        brew install node
        if command -v node &> /dev/null; then
            log_info "Node.js installed - $(node -v)"
        else
            log_error "Failed to install Node.js"
            MISSING_REQUIRED=1
        fi
    else
        log_error "Node.js not found. Please install manually."
        MISSING_REQUIRED=1
    fi
fi

# --- Check npm ---
if command -v npm &> /dev/null; then
    log_info "npm - v$(npm -v)"
else
    log_error "npm not found"
    MISSING_REQUIRED=1
fi

# --- Check Redis Stack (with RediSearch/RedisJSON) ---
find_redis_stack_server() {
    local paths=(
        "/opt/homebrew/Caskroom/redis-stack-server/*/bin/redis-stack-server"
        "/usr/local/Caskroom/redis-stack-server/*/bin/redis-stack-server"
        "/opt/homebrew/bin/redis-stack-server"
        "/usr/local/bin/redis-stack-server"
    )
    for pattern in "${paths[@]}"; do
        for path in $pattern; do
            if [ -x "$path" ]; then
                echo "$path"
                return 0
            fi
        done
    done
    return 1
}

start_redis_stack() {
    local redis_server=$(find_redis_stack_server)
    if [ -z "$redis_server" ]; then
        log_error "Redis Stack server not found. Please install: brew install redis-stack/redis-stack/redis-stack-server"
        return 1
    fi
    
    log_warn "Starting Redis Stack..."
    "$redis_server" --daemonize yes
    
    local max_wait=10
    local waited=0
    while [ $waited -lt $max_wait ]; do
        if redis-cli ping 2>/dev/null | grep -q "PONG"; then
            log_info "Redis Stack started successfully"
            return 0
        fi
        sleep 1
        ((waited++))
    done
    log_error "Redis Stack failed to start within ${max_wait}s"
    return 1
}

if command -v redis-cli &> /dev/null; then
    if redis-cli ping 2>/dev/null | grep -q "PONG"; then
        # Check for RediSearch module
        MODULES=$(redis-cli INFO modules 2>/dev/null | grep -c "module:name=search")
        if [ "$MODULES" -ge 1 ]; then
            log_info "Redis Stack - Running (RediSearch enabled)"
        else
            log_warn "Redis is running but RediSearch module not loaded. Restarting as Redis Stack..."
            redis-cli shutdown 2>/dev/null || true
            sleep 1
            if ! start_redis_stack; then MISSING_REQUIRED=1; fi
        fi
    else
        if ! start_redis_stack; then MISSING_REQUIRED=1; fi
    fi
else
    log_error "redis-cli not found"
    MISSING_REQUIRED=1
fi

echo "==============================="

if [ $MISSING_REQUIRED -ne 0 ]; then
    log_error "Environment check failed. Please resolve issues and try again."
    exit 1
fi

# ========================================
# STOPPING SERVICES
# ========================================
echo "Stopping existing services..."

while IFS='|' read -r name path port; do
    name=${name#name=}
    path=${path#path=}
    port=${port#port=}
    
    pids=$(ps aux | grep "node.*api/$path" | grep -v grep | awk '{print $2}')
    if [ -n "$pids" ]; then
        echo "  Killing $name (api/$path) process: $pids"
        kill $pids 2>/dev/null
    fi
    
    p_pid=$(lsof -ti:$port 2>/dev/null)
    if [ -n "$p_pid" ]; then
        echo "  Cleaning port $port ($name): $p_pid"
        kill -9 $p_pid 2>/dev/null
    fi
done <<< "$SERVICES_DATA"

echo "Clearing old logs..."
rm -f api/*/debug.log api/*/*/debug.log
sleep 2

# ========================================
# STARTING SERVICES
# ========================================
echo "Starting services..."

while IFS='|' read -r name path port; do
    name=${name#name=}
    path=${path#path=}
    port=${port#port=}
    
    service_dir=$(dirname "api/$path")
    service_file=$(basename "$path")
    
    echo "Starting $name on port $port..."
    (cd "$service_dir" && nohup node "$service_file" > debug.log 2>&1 &)
done <<< "$SERVICES_DATA"

echo "All services started. Waiting for initialization..."
sleep 3

# ========================================
# HEALTH CHECK
# ========================================
echo "Checking service health..."
echo "========================="

failed=0

while IFS='|' read -r name path port; do
    name=${name#name=}
    port=${port#port=}
    
    printf "Checking %-15s (Port %5s)..." "$name" "$port"
    
    retry=0
    max_retries=10
    success=0
    while [ $retry -lt $max_retries ]; do
        if lsof -i:$port -sTCP:LISTEN &> /dev/null; then
            printf " ${GREEN}✓ Running${NC}\n"
            success=1
            break
        fi
        sleep 1
        ((retry++))
    done
    
    if [ $success -eq 0 ]; then
        printf " ${RED}✗ Failed${NC}\n"
        ((failed++))
    fi
done <<< "$SERVICES_DATA"

echo "========================="
if [ $failed -eq 0 ]; then
    printf "${GREEN}All systems active!${NC}\n"
else
    printf "${RED}%d service(s) failed to start.${NC}\n" "$failed"
    exit 1
fi
