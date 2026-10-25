import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const piAgentsDir = path.join(repoRoot, "agents-pi", "agents");

// Agent metadata specifications
const AGENTS = [
  {
    id: "sheldon",
    srcFile: "sheldon.md",
    name: "sheldon",
    antigravity: {
      color: "cyan",
      tools: "read, grep, find, ls, bash, write, edit",
      maxTurns: 40,
    },
    claude: {
      color: "#00BCD4",
      thinking: "high",
      allowedAgents: ["homero", "edna", "gorgory", "tio-bob", "frink", "contador", "saul"],
      readOnly: true,
      skills: "product-requirements, scrum-planning, database-design, backend-architecture, plan, auditor, cogni",
    },
    opencode: {
      color: "#05D5FA",
      permissions: [
        { action: "edit", resource: "*", effect: "deny" },
        { action: "edit", resource: "artifacts/**", effect: "allow" },
        { action: "edit", resource: "**/artifacts/**", effect: "allow" },
        { action: "shell", resource: "*", effect: "allow" },
        { action: "subagent", resource: "*", effect: "deny" },
        { action: "subagent", resource: "homero", effect: "allow" },
        { action: "subagent", resource: "edna", effect: "allow" },
        { action: "subagent", resource: "gorgory", effect: "allow" },
        { action: "subagent", resource: "tio-bob", effect: "allow" },
        { action: "subagent", resource: "frink", effect: "allow" },
        { action: "subagent", resource: "contador", effect: "allow" },
        { action: "subagent", resource: "saul", effect: "allow" },
      ],
    },
  },
  {
    id: "homero",
    srcFile: "homero.md",
    name: "homero",
    antigravity: {
      color: "yellow",
      tools: "read, edit, write, bash, grep, find, ls",
      maxTurns: 50,
    },
    claude: {
      color: "#FFB300",
      thinking: "medium",
      readOnly: false,
      skills: "react-typescript-clean-code, react-native-architecture, backend-architecture, testing-strategy, database-design, zustand, css-architecture, cogni",
    },
    opencode: {
      color: "#FFD900",
      permissions: [
        { action: "edit", resource: "*", effect: "allow" },
        { action: "shell", resource: "*", effect: "allow" },
      ],
    },
  },
  {
    id: "edna",
    srcFile: "edna.md",
    name: "edna",
    antigravity: {
      color: "magenta",
      tools: "read, edit, write, bash, grep, find, ls",
      maxTurns: 40,
    },
    claude: {
      color: "#E91E63",
      thinking: "medium",
      readOnly: false,
      skills: "visual-craft, frontend-design, ux-wireframing, mobile-native, ux-decision, ui-craft, ui-craft-dense-dashboard, ui-craft-editorial, ui-craft-minimal, accessibility, impeccable, landing-page-design, cogni",
    },
    opencode: {
      color: "#FF2A85",
      permissions: [
        { action: "edit", resource: "*", effect: "allow" },
        { action: "shell", resource: "*", effect: "allow" },
      ],
    },
  },
  {
    id: "gorgory",
    srcFile: "gorgory.md",
    name: "gorgory",
    antigravity: {
      color: "blue",
      tools: "read, grep, find, ls, bash",
      maxTurns: 40,
    },
    claude: {
      color: "#2196F3",
      thinking: "medium",
      readOnly: true,
      skills: "security-hardening, database-design, backend-architecture, auditor, cogni",
    },
    opencode: {
      color: "#3A86FF",
      permissions: [
        { action: "edit", resource: "*", effect: "deny" },
        { action: "shell", resource: "*", effect: "allow" },
      ],
    },
  },
  {
    id: "tio-bob",
    srcFile: "tio-bob.md",
    name: "tio-bob",
    antigravity: {
      color: "purple",
      tools: "read, grep, find, ls, bash",
      maxTurns: 40,
    },
    claude: {
      color: "#9C27B0",
      thinking: "medium",
      readOnly: true,
      skills: "testing-strategy, auditor, cogni",
    },
    opencode: {
      color: "#8338EC",
      permissions: [
        { action: "edit", resource: "*", effect: "deny" },
        { action: "shell", resource: "*", effect: "allow" },
      ],
    },
  },
  {
    id: "frink",
    srcFile: "professor-frink.md",
    name: "frink",
    antigravity: {
      color: "green",
      tools: "read, grep, find, ls, bash",
      maxTurns: 40,
    },
    claude: {
      color: "#4CAF50",
      thinking: "medium",
      readOnly: true,
      skills: "react-typescript-clean-code, react-native-architecture, backend-architecture, database-design, zustand, auditor, cogni",
    },
    opencode: {
      color: "#00E676",
      permissions: [
        { action: "edit", resource: "*", effect: "deny" },
        { action: "shell", resource: "*", effect: "allow" },
      ],
    },
  },
  {
    id: "contador",
    srcFile: "contador.md",
    name: "contador",
    antigravity: {
      color: "green",
      tools: "read, grep, find, ls, bash, write, edit",
      maxTurns: 30,
    },
    claude: {
      color: "#009688",
      thinking: "medium",
      readOnly: true,
      skills: "tax-accounting, cogni",
    },
    opencode: {
      color: "#00B4D8",
      permissions: [
        { action: "edit", resource: "*", effect: "deny" },
        { action: "edit", resource: "artifacts/**", effect: "allow" },
        { action: "shell", resource: "*", effect: "allow" },
      ],
    },
  },
  {
    id: "saul",
    srcFile: "saul.md",
    name: "saul",
    antigravity: {
      color: "orange",
      tools: "read, grep, find, ls, bash, write, edit",
      maxTurns: 30,
    },
    claude: {
      color: "#FF9800",
      thinking: "medium",
      readOnly: true,
      skills: "legal-compliance, cogni",
    },
    opencode: {
      color: "#FB5607",
      permissions: [
        { action: "edit", resource: "*", effect: "deny" },
        { action: "edit", resource: "artifacts/**", effect: "allow" },
        { action: "shell", resource: "*", effect: "allow" },
      ],
    },
  },
];

// Helper to extract description and markdown body from agents-pi
function parsePiAgent(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  const parts = content.split("---");
  if (parts.length < 3) {
    throw new Error(`Invalid frontmatter in ${filePath}`);
  }
  const rawFrontmatter = parts[1];
  const body = parts.slice(2).join("---").trim();

  // Extract description
  const descMatch = rawFrontmatter.match(/description:\s*([^\n]+(?:\n\s+[^\n]+)*)/);
  const description = descMatch ? descMatch[1].replace(/\n\s+/g, " ").trim() : "";

  return { description, body };
}

// 1. Generate Antigravity agents
function syncAntigravity(agent, parsed) {
  const targetDir = path.join(repoRoot, "agents-antigravity", "config", "agents");
  fs.mkdirSync(targetDir, { recursive: true });

  const targetPath = path.join(targetDir, `${agent.id}.md`);
  const frontmatter = [
    "---",
    `name: ${agent.name}`,
    `description: ${parsed.description}`,
    `color: ${agent.antigravity.color}`,
    `tools: ${agent.antigravity.tools}`,
    `max_turns: ${agent.antigravity.maxTurns}`,
    "prompt_mode: replace",
    "---",
    "",
  ].join("\n");

  fs.writeFileSync(targetPath, `${frontmatter}${parsed.body}\n`, "utf-8");
  console.log(`✓ Antigravity: ${agent.id}.md`);
}

// 2. Generate Claude Code agents
function syncClaude(agent, parsed) {
  const targetDir = path.join(repoRoot, "agents-claude", "agents");
  fs.mkdirSync(targetDir, { recursive: true });

  const targetPath = path.join(targetDir, `${agent.id}.md`);
  const lines = [
    "---",
    `name: ${agent.name}`,
    `description: ${parsed.description}`,
    "mode: all",
    `color: "${agent.claude.color}"`,
    `thinking: ${agent.claude.thinking}`,
    "systemPrompt: replace",
  ];

  if (agent.claude.allowedAgents) {
    lines.push("allowedAgents:");
    for (const a of agent.claude.allowedAgents) {
      lines.push(`  - ${a}`);
    }
  }

  lines.push("permission:");
  lines.push('  "*": allow');
  if (agent.claude.readOnly) {
    lines.push('  "edit":');
    lines.push('    "*": deny');
  }

  lines.push(`skills: ${agent.claude.skills}`);
  lines.push("---");
  lines.push("");

  fs.writeFileSync(targetPath, `${lines.join("\n")}${parsed.body}\n`, "utf-8");
  console.log(`✓ Claude Code: ${agent.id}.md`);
}

// 3. Generate OpenAI Codex agents
function syncCodex(agent, parsed) {
  const targetDir = path.join(repoRoot, "agents-codex", "agents");
  fs.mkdirSync(targetDir, { recursive: true });

  const targetPath = path.join(targetDir, `${agent.id}.md`);
  const lines = [
    "---",
    `name: ${agent.name}`,
    `description: ${parsed.description}`,
    "mode: all",
    `color: "${agent.claude.color}"`,
    `thinking: ${agent.claude.thinking}`,
    "systemPrompt: replace",
  ];

  if (agent.claude.allowedAgents) {
    lines.push("allowedAgents:");
    for (const a of agent.claude.allowedAgents) {
      lines.push(`  - ${a}`);
    }
  }

  lines.push("permission:");
  lines.push('  "*": allow');
  if (agent.claude.readOnly) {
    lines.push('  "edit":');
    lines.push('    "*": deny');
  }

  lines.push(`skills: ${agent.claude.skills}`);
  lines.push("---");
  lines.push("");

  fs.writeFileSync(targetPath, `${lines.join("\n")}${parsed.body}\n`, "utf-8");
  console.log(`✓ OpenAI Codex: ${agent.id}.md`);
}

// 4. Generate OpenCode agents
function syncOpenCode(agent, parsed) {
  const targetDir = path.join(repoRoot, "agents-opencode", "agents");
  fs.mkdirSync(targetDir, { recursive: true });

  const targetPath = path.join(targetDir, `${agent.id}.md`);
  const lines = [
    "---",
    `description: ${parsed.description}`,
    "mode: all",
    "model: deepseek-ryg/deepseek-v4-flash",
    `color: "${agent.opencode.color}"`,
    "permissions:",
  ];

  for (const perm of agent.opencode.permissions) {
    lines.push(`  - action: ${perm.action}`);
    lines.push(`    resource: "${perm.resource}"`);
    lines.push(`    effect: ${perm.effect}`);
  }

  lines.push("---");
  lines.push("");

  fs.writeFileSync(targetPath, `${lines.join("\n")}${parsed.body}\n`, "utf-8");
  console.log(`✓ OpenCode: ${agent.id}.md`);
}

// Run synchronization
console.log("Sincronizando agentes desde agents-pi/agents hacia todos los harnesses...\n");

for (const agent of AGENTS) {
  const srcPath = path.join(piAgentsDir, agent.srcFile);
  if (!fs.existsSync(srcPath)) {
    console.error(`Error: No se encontró origen ${srcPath}`);
    continue;
  }
  const parsed = parsePiAgent(srcPath);

  syncAntigravity(agent, parsed);
  syncClaude(agent, parsed);
  syncCodex(agent, parsed);
  syncOpenCode(agent, parsed);
}

// Also ensure professor-frink.md in agents-pi has a symlink/alias or is accessible as frink
const frinkAlias = path.join(piAgentsDir, "frink.md");
if (!fs.existsSync(frinkAlias)) {
  fs.copyFileSync(path.join(piAgentsDir, "professor-frink.md"), frinkAlias);
  console.log(`✓ Alias creado en agents-pi: frink.md`);
}

console.log("\n¡Sincronización de agentes completada con éxito!");
