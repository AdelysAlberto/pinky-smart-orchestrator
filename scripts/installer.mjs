#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import readline from "node:readline";
import { execSync } from "node:child_process";

const VERSION = "2.0.0";
const REPO_URL = "https://github.com/AdelysAlberto/pinky-smart-orchestrator.git";

// ANSI Color codes and styles
const colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  italic: "\x1b[3m",
  underline: "\x1b[4m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
};

const homedir = os.homedir();
const PINKY_HOME = path.join(homedir, ".pinky");

// Harness definitions
const HARNESSES = [
  {
    id: "pi",
    name: "Pi (pi code)",
    shortDesc: "Agentes, skills y reglas para Pi Coding Agent (~/.pi/agent/)",
    sourceDir: "agents-pi",
    targetDir: path.join(homedir, ".pi", "agent"),
    files: [
      { src: "AGENTS.md", dest: "AGENTS.md" },
      { src: "APPEND_SYSTEM.md", dest: "APPEND_SYSTEM.md" },
      { src: "agents", dest: "agents", isDir: true },
      { src: "rules", dest: "rules", isDir: true },
      { src: "skills", dest: "skills", isDir: true },
    ],
    postInstallNote: [
      "Si aún no lo tiene instalado, instale el plugin de Pi:",
      "  pi install npm:pi-open-agents",
      "Reinicie su sesión de Pi para cargar los nuevos agentes y skills.",
    ],
  },
  {
    id: "claude",
    name: "Claude Code",
    shortDesc: "Suite de subagentes, rules y skills para Anthropic Claude Code (~/.claude/)",
    sourceDir: "agents-claude",
    targetDir: path.join(homedir, ".claude"),
    files: [
      { src: "CLAUDE.md", dest: "CLAUDE.md" },
      { src: "agents", dest: "agents", isDir: true },
      { src: "rules", dest: "rules", isDir: true },
      { src: "skills", dest: "skills", isDir: true },
    ],
    postInstallNote: [
      "Reinicie o abra una nueva sesión de Claude Code para cargar las configuraciones.",
      "Compruebe los agentes con: claude y consulte su /agents o subagentes.",
    ],
  },
  {
    id: "cursor",
    name: "Cursor IDE / Composer",
    shortDesc: "Reglas, subagentes y skills para Cursor (~/.cursor/)",
    sourceDir: "agents-cursor",
    targetDir: path.join(homedir, ".cursor"),
    files: [
      { src: "AGENTS.md", dest: "AGENTS.md" },
      { src: "agents", dest: "agents", isDir: true },
      { src: "rules", dest: "rules", isDir: true },
      { src: "skills", dest: "skills", isDir: true },
    ],
    postInstallNote: [
      "Cierre completamente Cursor IDE y vuelva a abrirlo.",
      "Para proyectos específicos también puede copiar el contenido en <proyecto>/.cursor/",
    ],
  },
  {
    id: "codex",
    name: "OpenAI Codex",
    shortDesc: "Bundle de configuración y agentes para OpenAI Codex (~/.codex/)",
    sourceDir: "agents-codex",
    targetDir: path.join(homedir, ".codex"),
    files: [
      { src: "AGENTS.md", dest: "AGENTS.md" },
      { src: "config.toml", dest: "config.toml" },
      { src: "agents", dest: "agents", isDir: true },
      { src: "rules", dest: "rules", isDir: true },
      { src: "skills", dest: "skills", isDir: true },
    ],
    postInstallNote: [
      "Reinicie su entorno OpenAI Codex CLI o interfaz para aplicar las directivas.",
    ],
  },
  {
    id: "opencode",
    name: "OpenCode",
    shortDesc: "Configuración global de OpenCode (~/.config/opencode/)",
    sourceDir: "agents-opencode",
    targetDir: path.join(homedir, ".config", "opencode"),
    files: [
      { src: "AGENTS.md", dest: "AGENTS.md" },
      { src: "opencode.json", dest: "opencode.json" },
      { src: "agents", dest: "agents", isDir: true },
      { src: "rules", dest: "rules", isDir: true },
      { src: "skills", dest: "skills", isDir: true },
    ],
    postInstallNote: [
      "Reinicie el servicio o CLI de OpenCode para cargar los agentes y skills.",
    ],
  },
  {
    id: "copilot",
    name: "VS Code GitHub Copilot",
    shortDesc: "Agentes personalizados, instrucciones y skills (~/.copilot/)",
    sourceDir: "agents-copilot",
    targetDir: path.join(homedir, ".copilot"),
    files: [
      { src: "agents", dest: "agents", isDir: true },
      { src: "instructions", dest: "instructions", isDir: true },
      { src: "skills", dest: "skills", isDir: true },
    ],
    postInstallNote: [
      "Recargue la ventana de Visual Studio Code (Developer: Reload Window).",
      "Los subagentes e instrucciones personalizadas estarán disponibles en Chat/Edits.",
    ],
  },
  {
    id: "antigravity",
    name: "Google Antigravity (IDE & Antigravity 2.0)",
    shortDesc: "Configuración global de Antigravity (~/.gemini/config/ y ~/.gemini/GEMINI.md)",
    sourceDir: "agents-antigravity",
    targetDir: path.join(homedir, ".gemini"),
    files: [
      { src: "GEMINI.md", dest: "GEMINI.md" },
      { src: "config/AGENTS.md", dest: "config/AGENTS.md" },
      { src: "config/agents", dest: "config/agents", isDir: true },
      { src: "config/rules", dest: "config/rules", isDir: true },
      { src: "config/skills", dest: "config/skills", isDir: true },
    ],
    postInstallNote: [
      "Reinicie el IDE Antigravity o la sesión del agente para aplicar la nueva configuración.",
    ],
  },
  {
    id: "all",
    name: "Todos los Harnesses (Instalación Completa)",
    shortDesc: "Instala Pinky Smart Orchestrator en todos los entornos soportados",
    sourceDir: "",
    targetDir: "",
    files: [],
    postInstallNote: [
      "Se han configurado todos los harnesses soportados.",
      "Cierre y vuelva a abrir los harnesses correspondientes para cargar las configuraciones.",
    ],
  },
];

// Helper to copy directory recursively
function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Count files in directory recursively
function countFiles(dir) {
  let count = 0;
  if (!fs.existsSync(dir)) return 0;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      count += countFiles(fullPath);
    } else {
      count += 1;
    }
  }
  return count;
}

// Check if a harness is installed
function isHarnessInstalled(harness) {
  if (harness.id === "all") return false;
  return fs.existsSync(harness.targetDir);
}

// Install a single harness
function installHarness(harness, repoRoot) {
  console.log(`\n${colors.cyan}--- Instalando ${harness.name} ---${colors.reset}`);
  const harnessSrc = path.join(repoRoot, harness.sourceDir);

  if (!fs.existsSync(harnessSrc)) {
    console.error(
      `${colors.red}Error: No se encontró el directorio de origen ${harnessSrc}${colors.reset}`
    );
    return false;
  }

  fs.mkdirSync(harness.targetDir, { recursive: true });

  let copiedFiles = 0;
  for (const item of harness.files) {
    const srcPath = path.join(harnessSrc, item.src);
    const destPath = path.join(harness.targetDir, item.dest);

    if (!fs.existsSync(srcPath)) {
      console.warn(
        `${colors.yellow}Aviso: Archivo o carpeta no encontrada: ${item.src}${colors.reset}`
      );
      continue;
    }

    if (item.isDir) {
      copyDirSync(srcPath, destPath);
      copiedFiles += countFiles(srcPath);
    } else {
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      fs.copyFileSync(srcPath, destPath);
      copiedFiles += 1;
    }
  }

  console.log(
    `${colors.green}✓ ${harness.name} instalado con éxito en:${colors.reset} ${colors.bold}${harness.targetDir}${colors.reset}`
  );
  console.log(
    `${colors.dim}  Total de archivos y recursos desplegados: ${copiedFiles}${colors.reset}`
  );

  return true;
}

// Interactive menu
async function showInteractiveMenu(repoRoot) {
  const visibleItems = 4;
  let selectedIndex = 0;
  let scrollOffset = 0;
  let searchQuery = "";

  function getFilteredItems() {
    if (!searchQuery.trim()) return HARNESSES;
    const q = searchQuery.toLowerCase();
    return HARNESSES.filter(
      (h) =>
        h.name.toLowerCase().includes(q) ||
        h.id.toLowerCase().includes(q) ||
        h.shortDesc.toLowerCase().includes(q)
    );
  }

  function renderMenu() {
    const items = getFilteredItems();
    if (selectedIndex >= items.length) {
      selectedIndex = Math.max(0, items.length - 1);
    }

    if (selectedIndex < scrollOffset) {
      scrollOffset = selectedIndex;
    } else if (selectedIndex >= scrollOffset + visibleItems) {
      scrollOffset = selectedIndex - visibleItems + 1;
    }

    console.clear();
    console.log(
      `${colors.bold}${colors.cyan}======================================================${colors.reset}`
    );
    console.log(
      `${colors.bold}${colors.cyan}    PINKY SMART ORCHESTRATOR - GESTOR DE HARNESSES    ${colors.reset}`
    );
    console.log(
      `${colors.bold}${colors.cyan}======================================================${colors.reset}`
    );
    console.log(
      `${colors.dim}Seleccione el harness o entorno de agente donde desea instalar la suite:${colors.reset}\n`
    );

    if (searchQuery) {
      console.log(
        `${colors.yellow}Filtro de búsqueda:${colors.reset} "${searchQuery}" ${colors.dim}(Presione Backspace para borrar)${colors.reset}\n`
      );
    }

    if (items.length === 0) {
      console.log(
        `${colors.red}No se encontraron harnesses que coincidan con "${searchQuery}".${colors.reset}\n`
      );
    } else {
      if (scrollOffset > 0) {
        console.log(`   ${colors.dim}▲  ... (${scrollOffset} más arriba) ...${colors.reset}`);
      } else {
        console.log("");
      }

      const displaySlice = items.slice(scrollOffset, scrollOffset + visibleItems);
      displaySlice.forEach((item, idx) => {
        const actualIndex = scrollOffset + idx;
        const isSelected = actualIndex === selectedIndex;

        const cursor = isSelected
          ? `${colors.green}${colors.bold}❯ [X] `
          : `  [ ] `;
        const nameText = isSelected
          ? `${colors.bold}${colors.cyan}${item.name}${colors.reset}`
          : `${colors.white}${item.name}${colors.reset}`;

        const installedTag = isHarnessInstalled(item)
          ? ` ${colors.green}(Instalado)${colors.reset}`
          : "";

        console.log(`${cursor}${nameText}${installedTag}`);
        console.log(`      ${colors.dim}${item.shortDesc}${colors.reset}`);
        console.log("");
      });

      const remainingBelow = items.length - (scrollOffset + visibleItems);
      if (remainingBelow > 0) {
        console.log(`   ${colors.dim}▼  ... (${remainingBelow} más abajo) ...${colors.reset}`);
      } else {
        console.log("");
      }
    }

    console.log(
      `${colors.dim}------------------------------------------------------${colors.reset}`
    );
    console.log(
      `${colors.cyan}↑ / ↓${colors.reset}: Navegar | ${colors.cyan}Enter${colors.reset}: Seleccionar e Instalar | ${colors.cyan}Escribir${colors.reset}: Filtrar | ${colors.cyan}Ctrl+C${colors.reset}: Salir`
    );
  }

  return new Promise((resolve) => {
    readline.emitKeypressEvents(process.stdin);
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }
    process.stdin.resume();

    renderMenu();

    const onKeypress = (str, key) => {
      if (!key) return;

      if (key.ctrl && key.name === "c") {
        process.stdin.removeListener("keypress", onKeypress);
        if (process.stdin.isTTY) process.stdin.setRawMode(false);
        console.log(`\n${colors.yellow}Operación cancelada por el usuario.${colors.reset}`);
        process.exit(0);
      }

      const items = getFilteredItems();

      if (key.name === "up") {
        if (selectedIndex > 0) {
          selectedIndex--;
        } else {
          selectedIndex = Math.max(0, items.length - 1);
        }
        renderMenu();
      } else if (key.name === "down") {
        if (selectedIndex < items.length - 1) {
          selectedIndex++;
        } else {
          selectedIndex = 0;
        }
        renderMenu();
      } else if (key.name === "return") {
        if (items.length > 0) {
          const chosen = items[selectedIndex];
          process.stdin.removeListener("keypress", onKeypress);
          if (process.stdin.isTTY) process.stdin.setRawMode(false);
          resolve(chosen);
        }
      } else if (key.name === "backspace") {
        if (searchQuery.length > 0) {
          searchQuery = searchQuery.slice(0, -1);
          selectedIndex = 0;
          scrollOffset = 0;
          renderMenu();
        }
      } else if (str && str.length === 1 && !key.ctrl && !key.meta) {
        const num = parseInt(str, 10);
        if (!isNaN(num) && num >= 1 && num <= items.length) {
          selectedIndex = num - 1;
          renderMenu();
          return;
        }

        searchQuery += str;
        selectedIndex = 0;
        scrollOffset = 0;
        renderMenu();
      }
    };

    process.stdin.on("keypress", onKeypress);
  });
}

// Find repository root
function getRepoRoot() {
  // Check if running from global ~/.pinky or local repo
  if (fs.existsSync(path.join(PINKY_HOME, "agents-pi"))) {
    return PINKY_HOME;
  }
  const currentDir = path.resolve(path.join(path.dirname(new URL(import.meta.url).pathname), ".."));
  if (fs.existsSync(path.join(currentDir, "agents-pi"))) {
    return currentDir;
  }
  return currentDir;
}

// Command: status / list
function cmdStatus() {
  console.log(`\n${colors.bold}${colors.cyan}Pinky Smart Orchestrator - Estado de Harnesses:${colors.reset}\n`);
  for (const h of HARNESSES) {
    if (h.id === "all") continue;
    const installed = isHarnessInstalled(h);
    const statusText = installed
      ? `${colors.green}${colors.bold}INSTALADO${colors.reset} (${h.targetDir})`
      : `${colors.dim}NO INSTALADO${colors.reset}`;
    console.log(`  • ${colors.bold}${h.name.padEnd(28)}${colors.reset} : ${statusText}`);
  }
  console.log(`\n${colors.dim}Para instalar o actualizar un harness, ejecuten: pinky install${colors.reset}\n`);
}

// Command: version
function cmdVersion() {
  console.log(`\n${colors.bold}${colors.cyan}Pinky Smart Orchestrator${colors.reset} v${VERSION}`);
  const repoRoot = getRepoRoot();
  if (fs.existsSync(path.join(repoRoot, ".git"))) {
    try {
      const commit = execSync("git rev-parse --short HEAD", { cwd: repoRoot }).toString().trim();
      const branch = execSync("git rev-parse --abbrev-ref HEAD", { cwd: repoRoot }).toString().trim();
      console.log(`${colors.dim}Git Commit: ${commit} (${branch})${colors.reset}`);
    } catch {
      // Ignore git errors
    }
  }
  console.log(`${colors.dim}Ubicación de Pinky Core: ${repoRoot}${colors.reset}\n`);
}

// Command: upgrade
function cmdUpgrade() {
  console.log(`\n${colors.bold}${colors.cyan}Actualizando Pinky Smart Orchestrator...${colors.reset}\n`);
  const repoRoot = getRepoRoot();

  if (fs.existsSync(path.join(repoRoot, ".git"))) {
    try {
      console.log(`${colors.dim}Obteniendo últimos cambios desde el repositorio remoto...${colors.reset}`);
      execSync("git pull origin main", { cwd: repoRoot, stdio: "inherit" });
      console.log(`\n${colors.green}✓ Pinky Core actualizado con éxito.${colors.reset}\n`);
    } catch (err) {
      console.error(`${colors.red}Error al actualizar mediante git:${colors.reset}`, err.message);
    }
  } else {
    // If installed via archive, pull archive
    console.log(`${colors.dim}Descargando última versión de Pinky Core...${colors.reset}`);
    try {
      execSync(
        `curl -fsSL https://github.com/AdelysAlberto/pinky-smart-orchestrator/archive/refs/heads/main.tar.gz | tar -xz -C "${repoRoot}" --strip-components=1`,
        { stdio: "inherit" }
      );
      console.log(`\n${colors.green}✓ Pinky Core actualizado con éxito.${colors.reset}\n`);
    } catch (err) {
      console.error(`${colors.red}Error al descargar actualización:${colors.reset}`, err.message);
    }
  }

  // Re-sync all installed harnesses
  console.log(`${colors.cyan}Sincronizando harnesses instalados...${colors.reset}`);
  let updatedCount = 0;
  for (const h of HARNESSES) {
    if (h.id === "all") continue;
    if (isHarnessInstalled(h)) {
      installHarness(h, repoRoot);
      updatedCount++;
    }
  }

  if (updatedCount === 0) {
    console.log(`${colors.yellow}No se detectaron harnesses previamente instalados. Ejecuten 'pinky install' para configurar uno.${colors.reset}\n`);
  } else {
    console.log(`\n${colors.green}${colors.bold}✓ ${updatedCount} harnesses actualizados satisfactoriamente.${colors.reset}\n`);
  }
}

// Pi addons list
const PI_ADDONS = [
  "npm:pi-mcp-adapter",
  "npm:pi-web-access",
  "npm:@juicesharp/rpiv-todo",
  "npm:pi-memory",
  "npm:@juicesharp/rpiv-ask-user-question",
  "npm:@nguyenquangthai/pi-omp-theme",
  "npm:pi-open-agents",
];

// Command: pi-addons
function cmdPiAddons() {
  console.log(`\n${colors.bold}${colors.cyan}======================================================${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}       INSTALANDO PAQUETES Y ADDONS PARA PI          ${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}======================================================${colors.reset}\n`);

  try {
    execSync("which pi || command -v pi", { stdio: "ignore" });
  } catch {
    console.error(
      `${colors.red}Error: El ejecutable 'pi' no se encuentra instalado o no está en el PATH.${colors.reset}\n` +
      `Instalen Pi primero mediante: ${colors.bold}npm install -g @mariozechner/pi${colors.reset}\n`
    );
    process.exit(1);
  }

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < PI_ADDONS.length; i++) {
    const pkg = PI_ADDONS[i];
    console.log(`${colors.cyan}[${i + 1}/${PI_ADDONS.length}]${colors.reset} Instalando ${colors.bold}${pkg}${colors.reset}...`);
    try {
      execSync(`pi install ${pkg}`, { stdio: "inherit" });
      console.log(`${colors.green}✓ Instalado: ${pkg}${colors.reset}\n`);
      successCount++;
    } catch (err) {
      console.warn(`${colors.yellow}Aviso: Falló o ya se encuentra instalado: ${pkg}${colors.reset}\n`);
      failCount++;
    }
  }

  console.log(`${colors.bold}${colors.green}======================================================${colors.reset}`);
  console.log(`${colors.bold}${colors.green}           ADDONS DE PI COMPLETADOS                  ${colors.reset}`);
  console.log(`${colors.bold}${colors.green}======================================================${colors.reset}\n`);
  console.log(`  • Paquetes procesados con éxito: ${colors.bold}${successCount}${colors.reset}`);
  if (failCount > 0) {
    console.log(`  • Paquetes con aviso: ${colors.yellow}${failCount}${colors.reset}`);
  }
  console.log(`\n${colors.bold}${colors.magenta}Recordatorio:${colors.reset} Cierre y vuelva a abrir su sesión de Pi para cargar los nuevos plugins y extensiones.\n`);
}

// Command: help
function cmdHelp() {
  console.log(`
${colors.bold}${colors.cyan}Pinky Smart Orchestrator CLI${colors.reset} (v${VERSION})

${colors.bold}USO:${colors.reset}
  pinky [comando] [opciones]

${colors.bold}COMANDOS:${colors.reset}
  ${colors.green}install${colors.reset} [harness]     Abre el menú interactivo o instala directamente un harness
  ${colors.green}pi-addons${colors.reset}             Instala los plugins recomendados para Pi (pi-open-agents, mcp, memory, etc.)
  ${colors.green}upgrade, update${colors.reset}       Actualiza Pinky Core a la última versión y sincroniza los harnesses
  ${colors.green}status, list${colors.reset}          Muestra el estado de instalación de cada harness soportado
  ${colors.green}version, -v${colors.reset}           Muestra la versión instalada y commit actual
  ${colors.green}help, -h${colors.reset}              Muestra esta ayuda

${colors.bold}HARNESSES DISPONIBLES:${colors.reset}
  pi, claude, cursor, codex, opencode, copilot, antigravity, all

${colors.bold}EJEMPLOS:${colors.reset}
  pinky                      # Abre el menú interactivo
  pinky install pi           # Instala directamente en Pi Agent
  pinky pi-addons            # Instala los 7 paquetes recomendados de Pi
  pinky install all          # Instala en todos los harnesses
  pinky upgrade              # Actualiza Pinky y todos los harnesses
  pinky status               # Lista los harnesses configurados
`);
}

// Main dispatcher
async function main() {
  const args = process.argv.slice(2);
  const command = (args[0] || "").toLowerCase();
  const repoRoot = getRepoRoot();

  if (command === "version" || command === "-v" || command === "--version") {
    cmdVersion();
    return;
  }

  if (command === "help" || command === "-h" || command === "--help") {
    cmdHelp();
    return;
  }

  if (command === "status" || command === "list") {
    cmdStatus();
    return;
  }

  if (command === "upgrade" || command === "update") {
    cmdUpgrade();
    return;
  }

  if (command === "pi-addons" || command === "pi-plugins" || command === "addons") {
    cmdPiAddons();
    return;
  }

  // Handle install command or default interactive menu
  let targetHarnessId = null;
  if (command === "install" || command === "setup") {
    if (args[1]) {
      targetHarnessId = args[1].toLowerCase();
    }
  } else if (command && !command.startsWith("-")) {
    const directMatch = HARNESSES.find((h) => h.id === command);
    if (directMatch) {
      targetHarnessId = directMatch.id;
    }
  }

  let selectedHarness = null;
  if (targetHarnessId) {
    selectedHarness = HARNESSES.find((h) => h.id === targetHarnessId);
    if (!selectedHarness) {
      console.error(`${colors.red}Harness '${targetHarnessId}' no reconocido.${colors.reset}`);
      console.log(`Opciones válidas: ${HARNESSES.map((h) => h.id).join(", ")}`);
      process.exit(1);
    }
  }

  if (!selectedHarness) {
    selectedHarness = await showInteractiveMenu(repoRoot);
  }

  console.clear();
  console.log(
    `${colors.bold}${colors.cyan}======================================================${colors.reset}`
  );
  console.log(
    `${colors.bold}${colors.cyan}           EJECUTANDO INSTALACIÓN                    ${colors.reset}`
  );
  console.log(
    `${colors.bold}${colors.cyan}======================================================${colors.reset}`
  );

  const installedList = [];

  if (selectedHarness.id === "all") {
    console.log(
      `\n${colors.bold}Iniciando instalación global en todos los harnesses soportados...${colors.reset}`
    );
    for (const harness of HARNESSES) {
      if (harness.id === "all") continue;
      const success = installHarness(harness, repoRoot);
      if (success) installedList.push(harness);
    }
  } else {
    const success = installHarness(selectedHarness, repoRoot);
    if (success) installedList.push(selectedHarness);
  }

  // Summary and Next Steps
  console.log(
    `\n${colors.bold}${colors.green}======================================================${colors.reset}`
  );
  console.log(
    `${colors.bold}${colors.green}         ¡INSTALACIÓN COMPLETADA CON ÉXITO!           ${colors.reset}`
  );
  console.log(
    `${colors.bold}${colors.green}======================================================${colors.reset}`
  );

  console.log(`\n${colors.bold}Resumen de componentes instalados:${colors.reset}`);
  console.log(
    `  • ${colors.cyan}7 Agentes Especializados${colors.reset} (@sheldon, @homero, @edna, @gorgory, @tio-bob, @contador, @saul)`
  );
  console.log(
    `  • ${colors.cyan}8 Reglas Universales de Ingeniería${colors.reset} (engineering-invariants, runtime, frontend, backend, react-native, verification-checklist, commits)`
  );
  console.log(
    `  • ${colors.cyan}27 Skills Modulares${colors.reset} bajo el estándar Agent Skills`
  );

  console.log(
    `\n${colors.bold}${colors.yellow}PASOS OBLIGATORIOS PARA ACTIVAR LA CONFIGURACIÓN:${colors.reset}`
  );

  for (const h of installedList) {
    console.log(`\n${colors.bold}[${h.name}]${colors.reset}`);
    for (const note of h.postInstallNote) {
      console.log(`  ${colors.white}${note}${colors.reset}`);
    }
  }

  console.log(
    `\n${colors.bold}${colors.magenta}Recordatorio:${colors.reset} Debe ${colors.underline}cerrar y volver a abrir${colors.reset} su entorno/harness para que tome y aplique la nueva configuración de forma inmediata.\n`
  );

  const installedPi = installedList.some((h) => h.id === "pi" || h.id === "all");
  if (installedPi) {
    const installAddonsAns = await promptQuestion(
      `${colors.bold}${colors.yellow}¿Desea instalar los paquetes y plugins recomendados para Pi ahora? (pi-open-agents, mcp, memory, etc.) [S/n]: ${colors.reset}`
    );
    if (!installAddonsAns || installAddonsAns.toLowerCase().startsWith("s") || installAddonsAns.toLowerCase().startsWith("y")) {
      cmdPiAddons();
    }
  }

  await promptEnterToExit();
  process.exit(0);
}

function promptQuestion(questionText) {
  return new Promise((resolve) => {
    if (!process.stdin.isTTY) {
      resolve("");
      return;
    }
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(questionText, (ans) => {
      rl.close();
      resolve(ans.trim());
    });
  });
}

function promptEnterToExit() {
  return new Promise((resolve) => {
    if (!process.stdin.isTTY) {
      resolve();
      return;
    }
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(
      `\n${colors.bold}${colors.green}Presione Enter para finalizar y salir...${colors.reset}`,
      () => {
        rl.close();
        if (process.stdin.isTTY) {
          process.stdin.pause();
        }
        resolve();
      }
    );
  });
}

main().catch((err) => {
  console.error(`${colors.red}Error en Pinky CLI:${colors.reset}`, err);
  process.exit(1);
});
