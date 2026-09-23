#!/usr/bin/env bash

# ==============================================================================
# Pinky Smart Orchestrator - Universal CLI Installer & Bootstrapper
# ==============================================================================

set -e

# ANSI Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m' # No Color

PINKY_DIR="$HOME/.pinky"
BIN_DIR="$HOME/.local/bin"

# Ensure interactive input is connected to TTY when running from pipe/curl
if [ ! -t 0 ] && [ -r /dev/tty ]; then
  exec < /dev/tty
fi

# Track temp directory for cleanup
TEMP_DIR=""
cleanup() {
  if [ -n "$TEMP_DIR" ] && [ -d "$TEMP_DIR" ]; then
    rm -rf "$TEMP_DIR"
  fi
}
trap cleanup EXIT INT TERM

# Determine repository source
SCRIPT_DIR=""
if [ -n "$BASH_SOURCE" ] && [ -f "$BASH_SOURCE" ]; then
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
fi

mkdir -p "$PINKY_DIR"
mkdir -p "$BIN_DIR"

if [ -n "$SCRIPT_DIR" ] && [ -d "$SCRIPT_DIR/agents-pi" ] && [ -f "$SCRIPT_DIR/bin/pinky" ]; then
  # Local execution: sync current repo into ~/.pinky
  printf "${CYAN}${BOLD}Sincronizando Pinky Smart Orchestrator en ~/.pinky...${NC}\n"
  if command -v rsync >/dev/null 2>&1; then
    rsync -a --exclude=".git" "$SCRIPT_DIR/" "$PINKY_DIR/"
  else
    cp -R "$SCRIPT_DIR/"* "$PINKY_DIR/"
  fi
else
  # Remote execution via curl: clone or pull into ~/.pinky
  printf "${CYAN}${BOLD}Descargando Pinky Smart Orchestrator en ~/.pinky...${NC}\n"
  REPO_URL="https://github.com/AdelysAlberto/pinky-smart-orchestrator.git"
  TAR_URL="https://github.com/AdelysAlberto/pinky-smart-orchestrator/archive/refs/heads/main.tar.gz"

  if [ -d "$PINKY_DIR/.git" ]; then
    (cd "$PINKY_DIR" && git pull origin main >/dev/null 2>&1) || true
  elif command -v git >/dev/null 2>&1; then
    git clone --depth 1 "$REPO_URL" "$PINKY_DIR" >/dev/null 2>&1 || {
      curl -fsSL "$TAR_URL" | tar -xz -C "$PINKY_DIR" --strip-components=1 2>/dev/null
    }
  elif command -v curl >/dev/null 2>&1 && command -v tar >/dev/null 2>&1; then
    curl -fsSL "$TAR_URL" | tar -xz -C "$PINKY_DIR" --strip-components=1
  else
    printf "${RED}Error: Se requiere git o curl + tar para descargar Pinky.${NC}\n"
    exit 1
  fi
fi

# Detect JavaScript runtime (Node.js or Bun)
RUNTIME_BIN=""
if command -v bun >/dev/null 2>&1; then
  RUNTIME_BIN="bun"
elif command -v node >/dev/null 2>&1; then
  RUNTIME_BIN="node"
elif [ -x "$HOME/.bun/bin/bun" ]; then
  export BUN_INSTALL="$HOME/.bun"
  export PATH="$BUN_INSTALL/bin:$PATH"
  RUNTIME_BIN="bun"
fi

# Prompt to install Bun if neither is available
if [ -z "$RUNTIME_BIN" ]; then
  printf "\n${YELLOW}${BOLD}Aviso:${NC} No se detectó Node.js ni Bun en su sistema.\n"
  printf "Pinky CLI requiere Node.js o Bun para su interfaz interactiva.\n\n"
  printf "${BOLD}¿Desea instalar Bun automáticamente ahora? [S/n]: ${NC}"
  read -r INSTALL_BUN_REPLY

  if [[ "$INSTALL_BUN_REPLY" =~ ^[SsYy]?$ ]] || [ -z "$INSTALL_BUN_REPLY" ]; then
    printf "\n${CYAN}Instalando Bun...${NC}\n"
    if curl -fsSL https://bun.sh/install | bash; then
      export BUN_INSTALL="$HOME/.bun"
      export PATH="$BUN_INSTALL/bin:$PATH"
      if command -v bun >/dev/null 2>&1 || [ -x "$HOME/.bun/bin/bun" ]; then
        RUNTIME_BIN="bun"
        printf "${GREEN}✓ Bun instalado con éxito.${NC}\n\n"
      fi
    else
      printf "${RED}No se pudo instalar Bun automáticamente.${NC}\n\n"
    fi
  fi
fi

# Install 'pinky' binary wrapper into ~/.local/bin/pinky
mkdir -p "$BIN_DIR"
chmod +x "$PINKY_DIR/bin/pinky" 2>/dev/null || true
rm -f "$BIN_DIR/pinky" 2>/dev/null || true

cat << 'EOF' > "$BIN_DIR/pinky"
#!/usr/bin/env bash
PINKY_HOME="$HOME/.pinky"

# Ensure PATH includes bun and node
[ -d "$HOME/.bun/bin" ] && export PATH="$HOME/.bun/bin:$PATH"

RUNTIME_BIN=""
if command -v bun >/dev/null 2>&1; then
  RUNTIME_BIN="bun"
elif command -v node >/dev/null 2>&1; then
  RUNTIME_BIN="node"
else
  printf "\033[0;31mError: Node.js o Bun son requeridos para ejecutar Pinky CLI.\033[0m\n"
  exit 1
fi

exec "$RUNTIME_BIN" "$PINKY_HOME/bin/pinky" "$@"
EOF

chmod +x "$BIN_DIR/pinky"

# Also deploy Windows cmd & ps1 wrappers if available (for Git Bash / MSYS2 on Windows)
if [ -f "$PINKY_DIR/bin/pinky.cmd" ]; then
  cp "$PINKY_DIR/bin/pinky.cmd" "$BIN_DIR/pinky.cmd" 2>/dev/null || true
fi
if [ -f "$PINKY_DIR/bin/pinky.ps1" ]; then
  cp "$PINKY_DIR/bin/pinky.ps1" "$BIN_DIR/pinky.ps1" 2>/dev/null || true
fi

# Ensure ~/.local/bin is in shell RC files if not already present
add_to_path() {
  local rc_file="$1"
  if [ -f "$rc_file" ]; then
    if ! grep -q 'export PATH="$HOME/.local/bin:$PATH"' "$rc_file" && ! grep -q 'export PATH="$PATH:$HOME/.local/bin"' "$rc_file" && ! grep -q '.local/bin' "$rc_file"; then
      printf '\n# Pinky CLI\nexport PATH="$HOME/.local/bin:$PATH"\n' >> "$rc_file"
    fi
  fi
}

add_to_path "$HOME/.zshrc"
add_to_path "$HOME/.bashrc"
add_to_path "$HOME/.profile"
add_to_path "$HOME/.bash_profile"

# Fish shell support
if [ -d "$HOME/.config/fish" ]; then
  mkdir -p "$HOME/.config/fish/conf.d"
  if [ ! -f "$HOME/.config/fish/conf.d/pinky.fish" ]; then
    printf 'set -gx PATH $HOME/.local/bin $PATH\n' > "$HOME/.config/fish/conf.d/pinky.fish" 2>/dev/null || true
  fi
fi

# Windows Git Bash / MSYS2 PATH persistence via setx if available
if command -v setx >/dev/null 2>&1; then
  WIN_BIN_DIR="$(cygpath -w "$BIN_DIR" 2>/dev/null || echo "")"
  if [ -n "$WIN_BIN_DIR" ]; then
    setx PATH "%PATH%;$WIN_BIN_DIR" >/dev/null 2>&1 || true
  fi
fi

export PATH="$BIN_DIR:$PATH"

# Execute pinky interactive CLI
if [ -n "$RUNTIME_BIN" ]; then
  "$RUNTIME_BIN" "$PINKY_DIR/bin/pinky" "$@"
else
  printf "${GREEN}✓ Pinky CLI instalado en:${NC} ${BOLD}$BIN_DIR/pinky${NC}\n"
  printf "${YELLOW}Instale Node.js o Bun para ejecutar: pinky install${NC}\n"
fi
