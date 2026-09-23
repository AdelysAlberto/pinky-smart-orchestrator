#!/usr/bin/env bash

# ==============================================================================
# Pinky Smart Orchestrator - Release Automation Script
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

# Ensure interactive input is connected to TTY
if [ ! -t 0 ] && [ -r /dev/tty ]; then
  exec < /dev/tty
fi

# Ensure inside a git repository
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  printf "${RED}Error: Debe ejecutar este script dentro del repositorio Git de Pinky.${NC}\n"
  exit 1
fi

# Fetch remote tags to ensure we have the latest references
printf "${CYAN}Consultando tags remotos de Git...${NC}\n"
git fetch --tags origin >/dev/null 2>&1 || true

# Get current branch
CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"

# Get latest tag
LATEST_TAG="$(git tag -l "v*" --sort=-v:refname | head -n1)"

if [ -z "$LATEST_TAG" ]; then
  LATEST_TAG="v1.0.0"
  printf "${YELLOW}No se encontraron tags previos. Usando base inicial: ${BOLD}%s${NC}\n" "$LATEST_TAG"
fi

# Parse Major, Minor, Patch from latest tag (e.g. v1.0.5 -> 1, 0, 5)
RAW_VERSION="${LATEST_TAG#v}"
IFS='.' read -r MAJOR MINOR PATCH <<< "$RAW_VERSION"

# Default fallback if parsing fails
MAJOR="${MAJOR:-1}"
MINOR="${MINOR:-0}"
PATCH="${PATCH:-0}"

NEXT_PATCH="v${MAJOR}.${MINOR}.$((PATCH + 1))"
NEXT_MINOR="v${MAJOR}.$((MINOR + 1)).0"
NEXT_MAJOR="v$((MAJOR + 1)).0.0"

# Determine bump type from argument or prompt
BUMP_TYPE="$1"

if [ -z "$BUMP_TYPE" ]; then
  clear
  printf "${CYAN}${BOLD}======================================================${NC}\n"
  printf "${CYAN}${BOLD}       PINKY SMART ORCHESTRATOR - CREAR RELEASE       ${NC}\n"
  printf "${CYAN}${BOLD}======================================================${NC}\n\n"

  printf "Rama actual:   ${BOLD}${MAGENTA}%s${NC}\n" "$CURRENT_BRANCH"
  printf "Versión actual: ${BOLD}${GREEN}%s${NC}\n\n" "$LATEST_TAG"

  printf "${BOLD}Seleccione el tipo de incremento de versión:${NC}\n\n"
  printf "  ${BOLD}1)${NC} ${GREEN}patch${NC} (${BOLD}%s${NC})  ${DIM}-> Corrección de errores y ajustes menores${NC}\n" "$NEXT_PATCH"
  printf "  ${BOLD}2)${NC} ${CYAN}minor${NC} (${BOLD}%s${NC})  ${DIM}-> Nuevas funcionalidades, agentes o skills${NC}\n" "$NEXT_MINOR"
  printf "  ${BOLD}3)${NC} ${YELLOW}major${NC} (${BOLD}%s${NC})  ${DIM}-> Cambios estructurales o incompatibles${NC}\n" "$NEXT_MAJOR"
  printf "  ${BOLD}4)${NC} Personalizado         ${DIM}-> Introducir versión manualmente${NC}\n"
  printf "  ${BOLD}5)${NC} Cancelar\n\n"

  printf "${BOLD}Opción [1-5]: ${NC}"
  read -r SELECTION

  case "$SELECTION" in
    1|patch) BUMP_TYPE="patch" ;;
    2|minor) BUMP_TYPE="minor" ;;
    3|major) BUMP_TYPE="major" ;;
    4|custom) BUMP_TYPE="custom" ;;
    5|exit|q)
      printf "${YELLOW}Creación de release cancelada.${NC}\n"
      exit 0
      ;;
    *)
      printf "${RED}Opción inválida.${NC}\n"
      exit 1
      ;;
  esac
fi

# Calculate new tag
case "$BUMP_TYPE" in
  patch)
    NEW_TAG="$NEXT_PATCH"
    ;;
  minor)
    NEW_TAG="$NEXT_MINOR"
    ;;
  major)
    NEW_TAG="$NEXT_MAJOR"
    ;;
  custom)
    printf "\n${BOLD}Introduzca la nueva versión (ej. v1.2.0 o 1.2.0): ${NC}"
    read -r CUSTOM_VERSION
    if [[ ! "$CUSTOM_VERSION" =~ ^v ]]; then
      NEW_TAG="v$CUSTOM_VERSION"
    else
      NEW_TAG="$CUSTOM_VERSION"
    fi
    ;;
  v*|[0-9]*)
    if [[ ! "$BUMP_TYPE" =~ ^v ]]; then
      NEW_TAG="v$BUMP_TYPE"
    else
      NEW_TAG="$BUMP_TYPE"
    fi
    ;;
  *)
    printf "${RED}Tipo de bump no reconocido: '%s'. Use patch, minor, major o una versión (ej. 1.1.0).${NC}\n" "$BUMP_TYPE"
    exit 1
    ;;
esac

NEW_VERSION="${NEW_TAG#v}"

printf "\n${BOLD}Confirmación de Release:${NC}\n"
printf "  • Versión previa: ${DIM}%s${NC}\n" "$LATEST_TAG"
printf "  • Nueva versión:  ${GREEN}${BOLD}%s${NC}\n" "$NEW_TAG"
printf "  • Rama destino:   ${MAGENTA}%s${NC}\n\n" "$CURRENT_BRANCH"

printf "${BOLD}¿Desea proceder con la creación y despliegue del release? [S/n]: ${NC}"
read -r CONFIRM

if [[ ! "$CONFIRM" =~ ^[SsYy]?$ ]] && [ -n "$CONFIRM" ]; then
  printf "${YELLOW}Operación cancelada.${NC}\n"
  exit 0
fi

# 1. Update VERSION in bin/pinky
if [ -f "bin/pinky" ]; then
  printf "\n${CYAN}Actualizando versión en bin/pinky a %s...${NC}\n" "$NEW_VERSION"
  if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s/const VERSION = .*/const VERSION = \"$NEW_VERSION\";/" bin/pinky
  else
    sed -i "s/const VERSION = .*/const VERSION = \"$NEW_VERSION\";/" bin/pinky
  fi
fi

# 2. Stage and commit changes if any
printf "${CYAN}Preparando commit de release...${NC}\n"
git add -A

if ! git diff --cached --quiet; then
  git commit -m "chore(release): $NEW_TAG"
  printf "${GREEN}✓ Commit creado: chore(release): %s${NC}\n" "$NEW_TAG"
else
  printf "${DIM}No hay cambios en código para commit adicional.${NC}\n"
fi

# 3. Create annotated Git tag
printf "${CYAN}Creando tag Git %s...${NC}\n" "$NEW_TAG"
git tag -a "$NEW_TAG" -m "Release $NEW_TAG"
printf "${GREEN}✓ Tag %s creado.${NC}\n" "$NEW_TAG"

# 4. Push branch and tag to remote
printf "\n${CYAN}Haciendo push de la rama '%s' y el tag '%s' a origin...${NC}\n" "$CURRENT_BRANCH" "$NEW_TAG"
git push origin "$CURRENT_BRANCH"
git push origin "$NEW_TAG"
printf "${GREEN}✓ Push completado con éxito a origin.${NC}\n"

# 5. Create GitHub release if GitHub CLI (gh) is installed and authenticated
if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
  printf "\n${CYAN}Creando GitHub Release mediante gh CLI...${NC}\n"
  gh release create "$NEW_TAG" --title "Release $NEW_TAG" --generate-notes || {
    printf "${YELLOW}Aviso: No se pudo crear el GitHub release automáticamente.${NC}\n"
  }
  printf "${GREEN}✓ GitHub Release publicado.${NC}\n"
fi

printf "\n${GREEN}${BOLD}======================================================${NC}\n"
printf "${GREEN}${BOLD}         ¡RELEASE %s DESPLEGADO CON ÉXITO!            ${NC}\n" "$NEW_TAG"
printf "${GREEN}${BOLD}======================================================${NC}\n\n"
printf "Los usuarios pueden actualizar su instalación ejecutando:\n"
printf "  ${BOLD}pinky upgrade${NC}\n\n"
