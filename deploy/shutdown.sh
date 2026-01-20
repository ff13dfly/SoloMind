#!/bin/bash

# ANSI color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper for colored output
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
try {
    const services = JSON.parse(fs.readFileSync('$SERVICES_JSON', 'utf8'));
    services.forEach(s => {
        process.stdout.write([\`name=\${s.name.toUpperCase()}\`, \`path=\${s.path}\`, \`port=\${s.port}\`].join('|') + '\n');
    });
} catch (e) {
    process.stderr.write(e.message);
    process.exit(1);
}
")

if [ $? -ne 0 ]; then
    log_error "Failed to parse services.json: $SERVICES_DATA"
    exit 1
fi

cd "$ROOT_DIR" || exit

echo "Stopping services..."
echo "===================="

# Use a more POSIX-friendly way to read the lines
printf "%s" "$SERVICES_DATA" | while IFS='|' read -r name_raw path_raw port_raw; do
    [ -z "$name_raw" ] && continue
    
    name=${name_raw#name=}
    path=${path_raw#path=}
    port=${port_raw#port=}
    
    # 1. Kill by full path (Node.js process)
    # Use -f to match full command line
    pids=$(ps aux | grep "node.*api/$path" | grep -v grep | awk '{print $2}')
    if [ -n "$pids" ]; then
        printf "  Stopping %-15s (api/%s)..." "$name" "$path"
        kill $pids 2>/dev/null
        printf " ${GREEN}Done${NC}\n"
        sleep 0.2
    fi
    
    # 2. Kill by port (Strict cleanup)
    # Added -n to lsof for speed and -P to avoid service name lookups
    p_pid=$(lsof -tni:$port -sTCP:LISTEN 2>/dev/null)
    if [ -n "$p_pid" ]; then
        printf "  Cleaning port %5s (%s)..." "$port" "$name"
        kill -9 $p_pid 2>/dev/null
        printf " ${YELLOW}Force Killed${NC}\n"
    fi
done

# --- Stop SSL Proxy ---
SSL_PORT=3800
ssl_pid=$(lsof -tni:$SSL_PORT -sTCP:LISTEN 2>/dev/null)
if [ -n "$ssl_pid" ]; then
    printf "  Stopping SSL Proxy (port %s)..." "$SSL_PORT"
    kill -9 $ssl_pid 2>/dev/null
    printf " ${GREEN}Done${NC}\n"
fi

echo "===================="
log_info "All services stopped."
exit 0
