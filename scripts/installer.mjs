#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import readline from "node:readline";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const VERSION = "2.1.1";
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

// Cross-platform home resolution: supports macOS, Linux, WSL, and native Windows
function getHomedir() {
  if (process.platform === "win32") {
    return process.env.USERPROFILE || os.homedir();
  }
  return os.homedir() || process.env.HOME || "";
}

const homedir = getHomedir();
const PINKY_HOME = path.resolve(homedir, ".pinky");
const GLOBAL_AGENTS_DIR = path.resolve(homedir, ".agents");
const PI_AGENT_DIR = path.resolve(homedir, ".pi", "agent");

// Harness definitions
const HARNESSES = [
  {
    id: "pi",
    name: "Pi (pi code)",
    shortDesc: "Agentes, extensiones y directivas para Pi Coding Agent (~/.pi/agent/)",
    sourceDir: "agents-pi",
    targetDir: PI_AGENT_DIR,
    files: [],
    postInstallNote: [
      "Pi Coding Agent y sus extensiones han sido configurados automáticamente.",
      "Inicie o reinicie su sesión con 'pi' para cargar los nuevos agentes y extensiones.",
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
      { src: "commands", dest: "commands", isDir: true },
      { src: "skills", dest: "skills", isDir: true },
    ],
    postInstallNote: [
      "Reinicie el servicio o CLI de OpenCode para cargar los agentes y skills.",
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
    if (entry.name === ".DS_Store" || entry.name === "node_modules" || entry.name === ".git") continue;
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isSymbolicLink()) {
      if (!fs.existsSync(srcPath)) continue;
      try {
        const stat = fs.statSync(srcPath);
        if (stat.isDirectory()) {
          copyDirSync(srcPath, destPath);
        } else {
          fs.copyFileSync(srcPath, destPath);
        }
      } catch {
        continue;
      }
    } else if (entry.isDirectory()) {
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
    if (entry.name === ".DS_Store" || entry.name === "node_modules" || entry.name === ".git") continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) {
      if (!fs.existsSync(fullPath)) continue;
      try {
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          count += countFiles(fullPath);
        } else {
          count += 1;
        }
      } catch {
        continue;
      }
    } else if (entry.isDirectory()) {
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

// Install / sync global engineering policies into ~/.agents/policies/
function installGlobalPolicies(repoRoot) {
  const policiesSrc = path.join(repoRoot, "agents-globals", "policies");
  const policiesDest = path.join(GLOBAL_AGENTS_DIR, "policies");

  if (!fs.existsSync(policiesSrc)) {
    console.warn(
      `${colors.yellow}Aviso: No se encontró el directorio de policies en ${policiesSrc}${colors.reset}`
    );
    return false;
  }

  fs.mkdirSync(policiesDest, { recursive: true });
  copyDirSync(policiesSrc, policiesDest);
  const total = countFiles(policiesSrc);

  console.log(
    `${colors.green}✓ Policies globales instaladas en:${colors.reset} ${colors.bold}${policiesDest}${colors.reset}`
  );
  console.log(
    `${colors.dim}  Directivas y reglas de ingeniería sincronizadas: ${total} archivos${colors.reset}`
  );
  return true;
}

// Install / sync global modular skills into ~/.agents/skills/
function installGlobalSkills(repoRoot) {
  const skillsSrc = path.join(repoRoot, "agents-globals", "skills");
  const skillsDest = path.join(GLOBAL_AGENTS_DIR, "skills");

  if (!fs.existsSync(skillsSrc)) {
    console.warn(
      `${colors.yellow}Aviso: No se encontró el directorio de skills en ${skillsSrc}${colors.reset}`
    );
    return false;
  }

  fs.mkdirSync(skillsDest, { recursive: true });
  copyDirSync(skillsSrc, skillsDest);
  const skillCount = fs.readdirSync(skillsSrc, { withFileTypes: true }).filter(
    (entry) => entry.isDirectory() && entry.name !== ".DS_Store"
  ).length;
  const totalFiles = countFiles(skillsSrc);

  console.log(
    `${colors.green}✓ Agent Skills globales instalados en:${colors.reset} ${colors.bold}${skillsDest}${colors.reset}`
  );
  console.log(
    `${colors.dim}  Total de skills sincronizados: ${skillCount} (${totalFiles} archivos desplegados)${colors.reset}`
  );
  return true;
}

// Merge Pi settings.json preserving user models, providers, and custom configurations
function mergePiSettings(targetPath, templatePath) {
  try {
    const templateContent = JSON.parse(fs.readFileSync(templatePath, "utf-8"));
    let userContent = {};
    if (fs.existsSync(targetPath)) {
      try {
        userContent = JSON.parse(fs.readFileSync(targetPath, "utf-8"));
      } catch {
        userContent = {};
      }
    }

    // Merge packages without duplicates
    const basePackages = templateContent.packages || [];
    const userPackages = userContent.packages || [];
    const mergedPackages = Array.from(new Set([...userPackages, ...basePackages]));

    // Merge extensions without duplicates
    const baseExtensions = templateContent.extensions || [];
    const userExtensions = userContent.extensions || [];
    const mergedExtensions = Array.from(new Set([...userExtensions, ...baseExtensions]));

    // Merge subagents settings preserving user overrides
    const baseSubagents = templateContent.subagents || {};
    const userSubagents = userContent.subagents || {};
    const mergedSubagents = {
      ...baseSubagents,
      ...userSubagents,
      disableBuiltins:
        userSubagents.disableBuiltins !== undefined
          ? userSubagents.disableBuiltins
          : baseSubagents.disableBuiltins,
      defaultContext: userSubagents.defaultContext || baseSubagents.defaultContext,
      agentOverrides: {
        ...(baseSubagents.agentOverrides || {}),
        ...(userSubagents.agentOverrides || {}),
      },
    };

    // Retain all existing user fields (e.g. defaultProvider, defaultModel, enabledModels, theme)
    const merged = {
      ...templateContent,
      ...userContent,
      packages: mergedPackages,
      extensions: mergedExtensions,
      subagents: mergedSubagents,
      $schema: userContent.$schema || templateContent.$schema,
    };

    fs.writeFileSync(targetPath, JSON.stringify(merged, null, 2) + "\n", "utf-8");
  } catch {
    fs.copyFileSync(templatePath, targetPath);
  }
}

// Pi recommended addons list
const PI_ADDONS = [
  "npm:pi-subagents",
  "npm:pi-web-access",
  "npm:@juicesharp/rpiv-ask-user-question",
  "npm:@juicesharp/rpiv-todo",
  "npm:@nguyenquangthai/pi-omp-theme",
];

// Ensure Pi CLI is installed, updated, and configured with all recommended addons automatically
function ensurePiCliReady() {
  const candidateBins = [
    path.join(homedir, ".bun", "bin"),
    path.join(homedir, ".local", "bin"),
  ];
  try {
    const npmPrefix = execSync("npm config get prefix", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    if (npmPrefix) candidateBins.push(path.join(npmPrefix, "bin"));
  } catch {}
  for (const b of candidateBins) {
    if (fs.existsSync(path.join(b, "pi")) && !process.env.PATH.includes(b)) {
      process.env.PATH = `${b}:${process.env.PATH}`;
    }
  }

  // 1. Install Pi CLI if not present, or update it if present
  if (!checkCommandExists("pi")) {
    process.stdout.write(`  • Instalando Pi Coding Agent (@earendil-works/pi-coding-agent)... `);
    try {
      if (checkCommandExists("bun")) {
        execSync("bun add -g --ignore-scripts @earendil-works/pi-coding-agent", { stdio: "ignore" });
      } else if (checkCommandExists("npm")) {
        execSync("npm install -g --ignore-scripts @earendil-works/pi-coding-agent", { stdio: "ignore" });
      } else if (process.platform === "win32") {
        execSync('powershell -c "irm https://pi.dev/install.ps1 | iex"', { stdio: "ignore" });
      } else if (checkCommandExists("curl")) {
        execSync("curl -fsSL https://pi.dev/install.sh | sh", { stdio: "ignore" });
      }
    } catch {}

    // Refresh candidate bin paths
    for (const b of candidateBins) {
      if (fs.existsSync(path.join(b, "pi")) && !process.env.PATH.includes(b)) {
        process.env.PATH = `${b}:${process.env.PATH}`;
      }
    }

    if (checkCommandExists("pi")) {
      console.log(`${colors.green}✓${colors.reset}`);
    } else {
      console.log(`${colors.yellow}⚠ (se intentó instalar; configure manualmente desde https://pi.dev si es necesario)${colors.reset}`);
    }
  } else {
    process.stdout.write(`  • Verificando y actualizando Pi Coding Agent... `);
    try {
      if (checkCommandExists("bun")) {
        execSync("bun add -g --ignore-scripts @earendil-works/pi-coding-agent", { stdio: "ignore" });
      } else if (checkCommandExists("npm")) {
        execSync("npm install -g --ignore-scripts @earendil-works/pi-coding-agent", { stdio: "ignore" });
      }
      console.log(`${colors.green}✓${colors.reset}`);
    } catch {
      console.log(`${colors.green}✓ (actualizado)${colors.reset}`);
    }
  }

  // 2. Install and update all recommended addons automatically
  if (checkCommandExists("pi")) {
    process.stdout.write(`  • Sincronizando plugins y extensiones de Pi (${PI_ADDONS.length} paquetes)... `);
    try {
      execSync("pi uninstall npm:pi-open-agents", { stdio: "ignore" });
    } catch {}
    try {
      execSync("pi uninstall npm:pi-mcp-adapter", { stdio: "ignore" });
    } catch {}
    try {
      execSync("pi update --extensions", { stdio: "ignore" });
    } catch {}
    try {
      execSync("pi update", { stdio: "ignore" });
    } catch {}

    for (const pkg of PI_ADDONS) {
      try {
        execSync(`pi install ${pkg}`, { stdio: "ignore" });
      } catch {}
    }
    console.log(`${colors.green}✓${colors.reset}`);
  }
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

  // Rutina de preparación y despliegue automático para Pi
  if (harness.id === "pi") {
    ensurePiCliReady();
  }

  fs.mkdirSync(harness.targetDir, { recursive: true });

  let copiedFiles = 0;
  if (harness.id === "pi") {
    // Si selecciona Pi, se copia todo el contenido de agents-pi dentro de ~/.pi/agent/
    const entries = fs.readdirSync(harnessSrc, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === ".DS_Store") continue;
      const srcPath = path.join(harnessSrc, entry.name);
      const destPath = path.join(harness.targetDir, entry.name);

      if (entry.isDirectory()) {
        copyDirSync(srcPath, destPath);
        copiedFiles += countFiles(srcPath);
      } else {
        fs.mkdirSync(path.dirname(destPath), { recursive: true });
        if (entry.name === "settings.json") {
          mergePiSettings(destPath, srcPath);
        } else {
          fs.copyFileSync(srcPath, destPath);
        }
        copiedFiles += 1;
      }
    }
  } else {
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
  }

  console.log(
    `${colors.green}✓ ${harness.name} instalado con éxito en:${colors.reset} ${colors.bold}${harness.targetDir}${colors.reset}`
  );
  console.log(
    `${colors.dim}  Total de archivos y recursos desplegados: ${copiedFiles}${colors.reset}`
  );

  // Asegurar instalación de memoria semántica Cogni
  ensureCogniInstalled();

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
  const currentFilePath = fileURLToPath(import.meta.url);
  const scriptDir = path.resolve(path.dirname(currentFilePath), "..");
  if (fs.existsSync(path.join(scriptDir, "agents-pi"))) {
    return scriptDir;
  }
  if (fs.existsSync(path.join(process.cwd(), "agents-pi"))) {
    return process.cwd();
  }
  if (fs.existsSync(path.join(PINKY_HOME, "agents-pi"))) {
    return PINKY_HOME;
  }
  return scriptDir;
}

// Command: status / list
function cmdStatus() {
  console.log(`\n${colors.bold}${colors.cyan}Pinky Smart Orchestrator - Estado de Harnesses y Recursos Globales:${colors.reset}\n`);

  const policiesPath = path.join(GLOBAL_AGENTS_DIR, "policies");
  const skillsPath = path.join(GLOBAL_AGENTS_DIR, "skills");
  const policiesInstalled = fs.existsSync(policiesPath);
  const skillsInstalled = fs.existsSync(skillsPath);

  console.log(`  ${colors.bold}Recursos Globales Cross-Harness (~/.agents/):${colors.reset}`);
  console.log(
    `  • ${"Policies Globales".padEnd(28)} : ${policiesInstalled ? `${colors.green}${colors.bold}INSTALADO${colors.reset} (${policiesPath})` : `${colors.dim}NO INSTALADO${colors.reset}`}`
  );
  console.log(
    `  • ${"Agent Skills Globales".padEnd(28)} : ${skillsInstalled ? `${colors.green}${colors.bold}INSTALADO${colors.reset} (${skillsPath})` : `${colors.dim}NO INSTALADO${colors.reset}`}`
  );
  console.log("");

  console.log(`  ${colors.bold}Harnesses Específicos:${colors.reset}`);
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

  // Sincronizar siempre policies globales en upgrade
  console.log(`\n${colors.cyan}Sincronizando policies globales (~/.agents/policies/)...${colors.reset}`);
  installGlobalPolicies(repoRoot);

  // Sincronizar skills si ya estaban presentes en ~/.agents/skills/
  if (fs.existsSync(path.join(GLOBAL_AGENTS_DIR, "skills"))) {
    console.log(`${colors.cyan}Sincronizando skills globales (~/.agents/skills/)...${colors.reset}`);
    installGlobalSkills(repoRoot);
  }

  // Detección de Pi para sincronización
  const piHarness = HARNESSES.find((h) => h.id === "pi");
  const usesPi = isHarnessInstalled(piHarness) || checkCommandExists("pi");

  // Re-sync all installed harnesses
  console.log(`${colors.cyan}Sincronizando harnesses instalados...${colors.reset}`);
  let updatedCount = 0;
  for (const h of HARNESSES) {
    if (h.id === "all") continue;
    if (isHarnessInstalled(h) || (h.id === "pi" && usesPi)) {
      installHarness(h, repoRoot);
      updatedCount++;
    }
  }

  // Asegurar Cogni en upgrade
  ensureCogniInstalled();

  if (updatedCount === 0) {
    console.log(`${colors.yellow}No se detectaron harnesses previamente instalados. Ejecuten 'pinky install' para configurar uno.${colors.reset}\n`);
  } else {
    console.log(`\n${colors.green}${colors.bold}✓ ${updatedCount} harnesses actualizados y sincronizados satisfactoriamente.${colors.reset}\n`);
  }
}

// Command: pi-addons
function cmdPiAddons() {
  console.log(`\n${colors.bold}${colors.cyan}======================================================${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}       SINCRONIZANDO PI CODING AGENT Y ADDONS         ${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}======================================================${colors.reset}\n`);

  ensurePiCliReady();

  console.log(`\n${colors.bold}${colors.green}======================================================${colors.reset}`);
  console.log(`${colors.bold}${colors.green}           PI Y ADDONS SINCRONIZADOS                 ${colors.reset}`);
  console.log(`${colors.bold}${colors.green}======================================================${colors.reset}\n`);
  console.log(`  • Paquetes recomendados configurados: ${colors.bold}${PI_ADDONS.join(", ")}${colors.reset}`);
  console.log(`\n${colors.bold}${colors.magenta}Recordatorio:${colors.reset} Cierre y vuelva a abrir su sesión de Pi para cargar los nuevos plugins y extensiones.\n`);
}

// Helper to check if a command exists in PATH
function checkCommandExists(cmd) {
  try {
    execSync(process.platform === "win32" ? `where ${cmd}` : `which ${cmd} || command -v ${cmd}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

// Helper to check if Cogni is installed and operational
function checkCogniInstalled() {
  try {
    execSync(
      process.platform === "win32"
        ? "cogni stats 2>nul || where cogni"
        : "cogni stats 2>/dev/null || which cogni || command -v cogni || test -x ~/.local/bin/cogni",
      { stdio: "ignore" }
    );
    return true;
  } catch {
    return false;
  }
}

// Clean and user-friendly Cogni memory installer
function ensureCogniInstalled() {
  if (checkCogniInstalled()) {
    return true;
  }

  process.stdout.write(`  • Verificando e instalando memoria semántica local (Cogni)... `);
  const isWindows = process.platform === "win32";
  let installed = false;

  if (isWindows) {
    try {
      execSync("go install github.com/AdelysAlberto/cogni/cmd/cogni@latest", { stdio: "pipe" });
      installed = true;
    } catch {
      try {
        execSync(
          'bash -c "curl -fsSL https://raw.githubusercontent.com/AdelysAlberto/cogni-memory/main/install.sh | bash"',
          { stdio: "pipe" }
        );
        installed = true;
      } catch {
        // Fallback silencioso
      }
    }
  } else {
    try {
      execSync(
        "curl -fsSL https://raw.githubusercontent.com/AdelysAlberto/cogni-memory/main/install.sh | bash",
        { stdio: "pipe" }
      );
      installed = true;
    } catch {
      // Fallback silencioso
    }
  }

  if (installed || checkCogniInstalled()) {
    console.log(`${colors.green}✓${colors.reset}`);
    return true;
  } else {
    console.log(`${colors.yellow}⚠ (omitiendo auto-instalación; instale con curl si lo requiere)${colors.reset}`);
    return false;
  }
}

// Herdr installer & integrator
async function cmdHerdr(installedList = []) {
  console.log(`\n${colors.bold}${colors.cyan}======================================================${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}       HERDR: MULTI-AGENT DASHBOARD & PANEL MANAGER  ${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}======================================================${colors.reset}\n`);

  console.log(`💡 ${colors.bold}Herdr${colors.reset} supervisa y orquesta múltiples agentes CLI en paralelo (Pi, OpenCode, Claude).`);
  console.log(`   ${colors.dim}Más información y lectura recomendada:${colors.reset} ${colors.underline}https://www.webreactiva.com/blog/herdr${colors.reset}\n`);

  const ans = await promptQuestion(
    `${colors.bold}${colors.yellow}¿Desean instalar Herdr, sus integraciones y la skill de agente? [s/N]: ${colors.reset}`
  );

  if (!ans || (!ans.toLowerCase().startsWith("s") && !ans.toLowerCase().startsWith("y"))) {
    console.log(`${colors.dim}Omitiendo instalación de Herdr.${colors.reset}\n`);
    return;
  }

  console.log(`\n${colors.cyan}[1/3] Descargando e instalando binario de Herdr...${colors.reset}`);
  if (process.platform === "win32") {
    try {
      execSync('powershell -ExecutionPolicy Bypass -c "irm https://herdr.dev/install.ps1 | iex"', { stdio: "inherit" });
      console.log(`${colors.green}✓ Binario de Herdr instalado correctamente en Windows.${colors.reset}\n`);
    } catch {
      console.warn(`${colors.yellow}Aviso: Falló la instalación directa de PowerShell. Intentando con instalador CMD...${colors.reset}`);
      try {
        execSync("curl.exe -fsSLo install.cmd https://herdr.dev/install.cmd && install.cmd && del install.cmd", { stdio: "inherit" });
        console.log(`${colors.green}✓ Binario de Herdr instalado correctamente en Windows.${colors.reset}\n`);
      } catch (err) {
        console.error(`${colors.red}Error al instalar Herdr en Windows:${colors.reset}`, err.message);
      }
    }
  } else {
    try {
      execSync("curl -fsSL https://herdr.dev/install.sh | sh", { stdio: "inherit" });
      console.log(`${colors.green}✓ Binario de Herdr instalado correctamente.${colors.reset}\n`);
    } catch (err) {
      console.error(`${colors.red}Error al instalar Herdr:${colors.reset}`, err.message);
    }
  }

  console.log(`${colors.cyan}[2/3] Configurando integraciones de agentes...${colors.reset}`);
  const hasPi = installedList.some((h) => h.id === "pi" || h.id === "all") || checkCommandExists("pi");
  const hasClaude = installedList.some((h) => h.id === "claude" || h.id === "all") || checkCommandExists("claude");
  const hasOpenCode = installedList.some((h) => h.id === "opencode" || h.id === "all") || checkCommandExists("opencode");

  const runHerdr = (cmd) => {
    try {
      const herdrBin = path.join(homedir, ".local", "bin", "herdr");
      const binToUse = fs.existsSync(herdrBin) ? herdrBin : "herdr";
      execSync(`${binToUse} ${cmd}`, { stdio: "inherit" });
      return true;
    } catch {
      return false;
    }
  };

  if (hasPi) {
    console.log(`  • Configurando integración para Pi...`);
    if (runHerdr("integration install pi")) {
      console.log(`    ${colors.green}✓ Integración Pi instalada.${colors.reset}`);
    }
  }

  if (hasClaude) {
    console.log(`  • Configurando integración para Claude Code...`);
    if (runHerdr("integration install claude")) {
      console.log(`    ${colors.green}✓ Integración Claude Code instalada.${colors.reset}`);
    }
  }

  if (hasOpenCode) {
    console.log(`  • Configurando integración para OpenCode...`);
    if (runHerdr("integration install opencode")) {
      console.log(`    ${colors.green}✓ Integración OpenCode instalada.${colors.reset}`);
    }
  }

  console.log(`\n${colors.cyan}[3/3] Instalando Skill de Herdr de forma global...${colors.reset}`);
  try {
    const runner = checkCommandExists("npx") ? "npx -y" : (checkCommandExists("bunx") ? "bunx" : null);
    if (runner) {
      execSync(`${runner} skills add ogulcancelik/herdr --skill herdr -g -y`, { stdio: "inherit" });
      console.log(`\n${colors.green}${colors.bold}✓ Skill de Herdr instalada globalmente.${colors.reset}`);
    } else {
      console.log(`  ${colors.dim}(Se requiere npx o bunx para instalar la skill de herdr; omitiendo)${colors.reset}`);
    }
  } catch (err) {
    console.warn(`\n${colors.yellow}Aviso: No se pudo instalar la skill automáticamente:${colors.reset}`, err.message);
  }

  console.log(`\n${colors.bold}${colors.green}======================================================${colors.reset}`);
  console.log(`${colors.bold}${colors.green}           HERDR CONFIGURADO CORRECTAMENTE            ${colors.reset}`);
  console.log(`${colors.bold}${colors.green}======================================================${colors.reset}\n`);
}

// Command: help
function cmdHelp() {
  console.log(`
${colors.bold}${colors.cyan}Pinky Smart Orchestrator CLI${colors.reset} (v${VERSION})

${colors.bold}USO:${colors.reset}
  pinky [comando] [opciones]

${colors.bold}COMANDOS:${colors.reset}
  ${colors.green}install${colors.reset} [harness]     Abre el menú interactivo o instala directamente un harness
  ${colors.green}pi-addons${colors.reset}             Instala los plugins recomendados para Pi (pi-subagents, web, todo, etc.)
  ${colors.green}herdr${colors.reset}                 Instala Herdr Dashboard, integraciones de agentes y skill global
  ${colors.green}upgrade, update${colors.reset}       Actualiza Pinky Core a la última versión y sincroniza los harnesses
  ${colors.green}status, list${colors.reset}          Muestra el estado de instalación de cada harness soportado
  ${colors.green}version, -v${colors.reset}           Muestra la versión instalada y commit actual
  ${colors.green}help, -h${colors.reset}              Muestra esta ayuda

${colors.bold}HARNESSES DISPONIBLES:${colors.reset}
  pi, claude, codex, opencode, antigravity, all

${colors.bold}EJEMPLOS:${colors.reset}
  pinky                      # Abre el menú interactivo
  pinky install pi           # Instala directamente en Pi Agent
  pinky pi-addons            # Instala los paquetes recomendados de Pi
  pinky herdr                # Instala Herdr Dashboard e integraciones
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
    await cmdPiAddons();
    return;
  }

  if (command === "herdr" || command === "install-herdr") {
    await cmdHerdr();
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

  // 1. Sincronizar siempre policies globales en ~/.agents/policies/ (default obligatorio)
  console.log(`\n${colors.cyan}[1/3] Sincronizando Policies Globales (~/.agents/policies/)...${colors.reset}`);
  installGlobalPolicies(repoRoot);

  // 2. Preguntar al usuario si desea copiar los skills en ~/.agents/skills/
  console.log(`\n${colors.cyan}[2/3] Verificando Agent Skills Globales (~/.agents/skills/)...${colors.reset}`);
  const installSkillsAns = await promptQuestion(
    `\n${colors.bold}${colors.yellow}¿Desea copiar los Agent Skills en ~/.agents/skills/?${colors.reset}\n` +
    `  ${colors.dim}(Ubicación estándar ~/.agents/ para que cualquier harness como Pi, Claude Code, Codex, OpenCode o Antigravity los reconozca)${colors.reset} [S/n]: `
  );

  let skillsCopied = false;
  if (!installSkillsAns || installSkillsAns.toLowerCase().startsWith("s") || installSkillsAns.toLowerCase().startsWith("y")) {
    skillsCopied = installGlobalSkills(repoRoot);
  } else {
    console.log(`  ${colors.dim}Omitiendo copia de skills globales en ~/.agents/skills/${colors.reset}`);
  }

  // 3. Desplegar el harness seleccionado
  console.log(`\n${colors.cyan}[3/3] Desplegando harness seleccionado...${colors.reset}`);
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
    `  • ${colors.cyan}Policies Globales de Ingeniería${colors.reset} en ${colors.bold}${path.join(GLOBAL_AGENTS_DIR, "policies")}${colors.reset}`
  );
  if (skillsCopied || fs.existsSync(path.join(GLOBAL_AGENTS_DIR, "skills"))) {
    const skillsPath = path.join(GLOBAL_AGENTS_DIR, "skills");
    const skillCount = fs.existsSync(skillsPath)
      ? fs.readdirSync(skillsPath, { withFileTypes: true }).filter((d) => d.isDirectory() && d.name !== ".DS_Store").length
      : 0;
    console.log(
      `  • ${colors.cyan}${skillCount} Agent Skills Modulares${colors.reset} en ${colors.bold}${skillsPath}${colors.reset}`
    );
  }
  console.log(
    `  • ${colors.cyan}8 Agentes Especializados${colors.reset} (@sheldon, @homero, @edna, @gorgory, @tio-bob, @frink, @contador, @saul)`
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

  // Herdr multi-agent manager recommendation
  await cmdHerdr(installedList);

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
