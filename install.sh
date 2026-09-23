#!/usr/bin/env bash

set -e

echo "Pinky Smart Orchestrator — Instalador Automático"
echo "────────────────────────────────────────────────"

HOME_DIR="$HOME"
TARGET_DIR="$HOME_DIR/.pinky"
BIN_INSTALL_DIR="$HOME_DIR/.local/bin"
VENV_DIR="$TARGET_DIR/env"
SRC_CACHE_DIR="$TARGET_DIR/src"

mkdir -p "$TARGET_DIR"
mkdir -p "$BIN_INSTALL_DIR"

# 1. Detect Python 3.11+
PYTHON_BIN=""
for candidate in python3.14 python3.13 python3.12 python3.11 python3; do
    if command -v "$candidate" &>/dev/null; then
        VER=$("$candidate" -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")' 2>/dev/null || echo "0.0")
        MAJOR=$(echo "$VER" | cut -d. -f1)
        MINOR=$(echo "$VER" | cut -d. -f2)
        if [ "$MAJOR" -ge 3 ] && [ "$MINOR" -ge 11 ]; then
            PYTHON_BIN="$(command -v "$candidate")"
            break
        fi
    fi
done

if [ -z "$PYTHON_BIN" ]; then
    echo "Error: Se requiere Python 3.11 o superior para ejecutar Pinky Orchestrator."
    echo "Por favor, instalen Python 3.11+ y vuelvan a ejecutar este instalador."
    exit 1
fi

echo "  Python detectado: $PYTHON_BIN"

# 2. Resolve Source Repository
if [ -f "pyproject.toml" ] && grep -q "pinky-orchestrator" pyproject.toml 2>/dev/null; then
    REPO_DIR="$(pwd)"
else
    echo "  Descargando repositorio de Pinky..."
    if [ -d "$SRC_CACHE_DIR/.git" ]; then
        git -C "$SRC_CACHE_DIR" fetch --quiet
        git -C "$SRC_CACHE_DIR" reset --hard --quiet origin/develop 2>/dev/null || git -C "$SRC_CACHE_DIR" reset --hard --quiet origin/main
    else
        rm -rf "$SRC_CACHE_DIR"
        git clone --quiet https://github.com/AdelysAlberto/pinky-orchestrator.git "$SRC_CACHE_DIR" 2>/dev/null || cp -r "$(pwd)" "$SRC_CACHE_DIR"
    fi
    REPO_DIR="$SRC_CACHE_DIR"
fi

# 3. Create isolated virtual environment in ~/.pinky/env
if [ ! -d "$VENV_DIR" ]; then
    echo "  Creando entorno virtual aislado en $VENV_DIR..."
    "$PYTHON_BIN" -m venv "$VENV_DIR"
fi

# 4. Install package and dependencies
echo "  Instalando Pinky Orchestrator y dependencias..."
"$VENV_DIR/bin/pip" install --upgrade pip --quiet
"$VENV_DIR/bin/pip" install -e "$REPO_DIR" --quiet

# 5. Create symlink in ~/.local/bin/pinky
ln -sf "$VENV_DIR/bin/pinky" "$BIN_INSTALL_DIR/pinky"
chmod +x "$BIN_INSTALL_DIR/pinky"

# 6. Run automated harness discovery and MCP configuration
echo "  Configurando integración MCP en todos los arneses instalados..."
"$BIN_INSTALL_DIR/pinky" init --project "$(pwd)"

echo ""
echo "────────────────────────────────────────────────"
echo "Pinky Orchestrator instalado exitosamente."
echo "Binario disponible en: $BIN_INSTALL_DIR/pinky"
echo ""
echo "Comandos disponibles:"
echo "  pinky run \"<tarea>\"     Ejecuta una tarea en sandbox aislado"
echo "  pinky start              Inicia el servidor y dashboard web (:8765)"
echo "  pinky list               Muestra las tareas encoladas"
echo "  pinky init               Reconfigura arneses e inyecta reglas"
echo ""
echo "AVISO: Si tienen abierto su IDE o arnés (Cursor, VS Code, Pi, OpenCode), reinícienlo para cargar las herramientas MCP."
