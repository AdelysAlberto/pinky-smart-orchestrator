#!/usr/bin/env bash

set -e

echo "Pinky Smart Orchestrator — Desinstalador"
echo "────────────────────────────────────────"

HOME_DIR="$HOME"
BIN_PATH="$HOME_DIR/.local/bin/pinky"
TARGET_DIR="$HOME_DIR/.pinky"

# 1. Remove binary
if [ -f "$BIN_PATH" ] || [ -L "$BIN_PATH" ]; then
    rm -f "$BIN_PATH"
    echo "  • Binario eliminado de $BIN_PATH"
fi

# 2. Run uninstaller module if python/pinky is available, or clean json files
echo "  • Limpiando entradas MCP en arneses de IA..."

clean_mcp() {
    local file="$1"
    if [ -f "$file" ]; then
        if grep -q '"pinky"' "$file" 2>/dev/null; then
            python3 -c "
import json, sys
try:
    with open('$file', 'r') as f:
        d = json.load(f)
    if 'mcpServers' in d and 'pinky' in d['mcpServers']:
        del d['mcpServers']['pinky']
        with open('$file', 'w') as f:
            json.dump(d, f, indent=2)
except Exception:
    pass
" 2>/dev/null || true
            echo "    - Limpiado: $file"
        fi
    fi
}

clean_mcp "$HOME_DIR/.cursor/mcp.json"
clean_mcp "$HOME_DIR/.vscode/mcp.json"
clean_mcp "$HOME_DIR/.pi/agent/mcp.json"
clean_mcp "$HOME_DIR/.omp/agent/mcp.json"
clean_mcp "$HOME_DIR/.opencode/mcp.json"
clean_mcp "$HOME_DIR/Library/Application Support/Claude/claude_desktop_config.json"
clean_mcp "$HOME_DIR/.claude.json"
clean_mcp "$HOME_DIR/.gemini/config/mcp_config.json"
clean_mcp "$HOME_DIR/.hermes/mcp.json"
clean_mcp "$HOME_DIR/.codeium/windsurf/mcp_config.json"

echo ""
read -p "¿Desean eliminar también el entorno virtual y base de datos en ~/.pinky? (s/N): " REMOVE_DATA || true

if [[ "$REMOVE_DATA" =~ ^[sSyY]$ ]]; then
    rm -rf "$TARGET_DIR"
    echo "  • Directorio ~/.pinky eliminado."
fi

echo ""
echo "Desinstalación de Pinky completada exitosamente."
