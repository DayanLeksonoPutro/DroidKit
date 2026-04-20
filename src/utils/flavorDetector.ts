import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

export interface FlavorInfo {
  name: string;
  dimension: string | null;
  applicationId: string | null;
}

export interface FlavorCombination {
  // label yang ditampilkan, e.g. "dev + free"
  label: string;
  // suffix task name, e.g. "DevFree"
  taskSuffix: string;
  applicationId: string | null;
}

export interface GradleTaskGroup {
  label: string;
  icon: string;
  tasks: GradleTask[];
}

export interface GradleTask {
  label: string;
  command: string;
  description?: string;
}

// ── Helpers ──────────────────────────────────────────────────────

function getWorkspaceRoot(): string | null {
  return vscode.workspace.workspaceFolders?.[0].uri.fsPath ?? null;
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function findAppBuildGradle(root: string): string | null {
  const candidates = [
    path.join(root, 'app', 'build.gradle.kts'),
    path.join(root, 'app', 'build.gradle'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  // Fallback: cari modul lain yang punya applicationId
  try {
    for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
      for (const fname of ['build.gradle.kts', 'build.gradle']) {
        const p = path.join(root, entry.name, fname);
        if (fs.existsSync(p) && fs.readFileSync(p, 'utf-8').includes('applicationId')) return p;
      }
    }
  } catch { /* skip */ }
  return null;
}

function extractBalancedBlock(content: string, keyword: string): string | null {
  const idx = content.search(new RegExp(keyword + '\\s*\\{'));
  if (idx === -1) return null;

  const start = content.indexOf('{', idx);
  if (start === -1) return null;

  let depth = 0;
  for (let i = start; i < content.length; i++) {
    if (content[i] === '{') depth++;
    else if (content[i] === '}') {
      depth--;
      if (depth === 0) return content.slice(start + 1, i);
    }
  }
  return null;
}

// Ekstrak body setiap flavor (balanced braces) dalam productFlavors block
function parseFlavorBodies(block: string): Array<{ name: string; body: string }> {
  const result: Array<{ name: string; body: string }> = [];

  // Match: flavorName { atau create("flavorName") {
  const nameRe = /(?:create\s*\(\s*["'](\w+)["']\s*\)|(\w+))\s*\{/g;
  let match: RegExpExecArray | null;

  const KEYWORDS = new Set(['android', 'defaultConfig', 'buildTypes', 'productFlavors',
    'signingConfigs', 'compileOptions', 'kotlinOptions', 'buildFeatures',
    'dependencies', 'repositories', 'plugins', 'sourceSets', 'lint']);

  while ((match = nameRe.exec(block)) !== null) {
    const name = match[1] ?? match[2];
    if (!name || KEYWORDS.has(name)) continue;

    const openBrace = match.index + match[0].length - 1;
    let depth = 0;
    let end = openBrace;
    for (let i = openBrace; i < block.length; i++) {
      if (block[i] === '{') depth++;
      else if (block[i] === '}') {
        depth--;
        if (depth === 0) { end = i; break; }
      }
    }
    result.push({ name, body: block.slice(openBrace + 1, end) });
  }
  return result;
}

// ── Core detectors ────────────────────────────────────────────────

function parseFlavorDimensions(content: string): string[] {
  // flavorDimensions "env", "store"  atau  flavorDimensions("env", "store")
  const match = content.match(/flavorDimensions\s*\(?\s*((?:["']\w+["']\s*,?\s*)+)\)?/);
  if (!match) return [];
  return [...match[1].matchAll(/["'](\w+)["']/g)].map(m => m[1]);
}

function parseFlavors(content: string): FlavorInfo[] {
  const block = extractBalancedBlock(content, 'productFlavors');
  if (!block) return [];

  const bodies = parseFlavorBodies(block);
  return bodies.map(({ name, body }) => {
    const dimMatch = body.match(/dimension\s*[=]?\s*["'](\w+)["']/);
    const idMatch  = body.match(/applicationId\s*[=]?\s*["']([^"']+)["']/);
    return {
      name,
      dimension:     dimMatch ? dimMatch[1] : null,
      applicationId: idMatch  ? idMatch[1]  : null,
    };
  });
}

// Cartesian product dari array of arrays
function cartesian<T>(arrays: T[][]): T[][] {
  return arrays.reduce<T[][]>(
    (acc, arr) => acc.flatMap(combo => arr.map(item => [...combo, item])),
    [[]]
  );
}

// ── Main export ───────────────────────────────────────────────────

export function detectFlavorCombinations(): FlavorCombination[] {
  const root = getWorkspaceRoot();
  if (!root) return [];

  const buildGradlePath = findAppBuildGradle(root);
  if (!buildGradlePath) return [];

  const content = fs.readFileSync(buildGradlePath, 'utf-8');
  const dimensions = parseFlavorDimensions(content);
  const flavors    = parseFlavors(content);

  if (flavors.length === 0) return [];

  // ── Single dimension atau tidak ada dimension ────────────────
  if (dimensions.length <= 1) {
    return flavors.map(f => ({
      label:         f.name,
      taskSuffix:    cap(f.name),
      applicationId: f.applicationId,
    }));
  }

  // ── Multiple dimensions → cartesian product ──────────────────
  // Group flavors by dimension
  const byDimension: Map<string, FlavorInfo[]> = new Map();
  for (const dim of dimensions) byDimension.set(dim, []);

  for (const f of flavors) {
    const dim = f.dimension ?? dimensions[0]; // fallback ke dimensi pertama
    byDimension.get(dim)?.push(f);
  }

  // Flavors yang tidak punya dimensi → masuk dimensi pertama
  const unassigned = flavors.filter(f => !f.dimension);
  if (unassigned.length > 0 && dimensions.length > 0) {
    for (const f of unassigned) {
      byDimension.get(dimensions[0])?.push(f);
    }
  }

  // Generate combinations mengikuti urutan dimensions
  const orderedGroups = dimensions.map(d => byDimension.get(d) ?? []).filter(g => g.length > 0);
  if (orderedGroups.some(g => g.length === 0)) return flavors.map(f => ({
    label: f.name, taskSuffix: cap(f.name), applicationId: f.applicationId,
  }));

  const combos = cartesian(orderedGroups);

  return combos.map(combo => ({
    label:         combo.map(f => f.name).join(' + '),
    taskSuffix:    combo.map(f => cap(f.name)).join(''),
    // ApplicationId: pakai yang terakhir di combo (AGP behavior — overrides in dimension order)
    applicationId: combo.map(f => f.applicationId).filter(Boolean).pop() ?? null,
  }));
}

// ── Task group builder ────────────────────────────────────────────

export function buildTaskGroups(): GradleTaskGroup[] {
  const combos = detectFlavorCombinations();

  if (combos.length === 0) {
    return [
      { label: 'Run',          icon: 'play',    tasks: [{ label: 'Install & Launch Debug', command: 'installDebug' }] },
      { label: 'Build Debug',  icon: 'tools',   tasks: [{ label: 'assembleDebug',          command: 'assembleDebug' }] },
      { label: 'Build Release',icon: 'package', tasks: [{ label: 'assembleRelease',        command: 'assembleRelease' }] },
      { label: 'Other',        icon: 'gear',    tasks: [{ label: 'clean',                  command: 'clean' }] },
    ];
  }

  return [
    {
      label: 'Run (Install + Launch)',
      icon: 'play',
      tasks: combos.map(c => ({
        label:       c.label,
        command:     `install${c.taskSuffix}Debug`,
        description: c.applicationId ?? `install${c.taskSuffix}Debug`,
      })),
    },
    {
      label: 'Build Debug APK',
      icon: 'tools',
      tasks: combos.map(c => ({
        label:       c.label,
        command:     `assemble${c.taskSuffix}Debug`,
        description: `assemble${c.taskSuffix}Debug`,
      })),
    },
    {
      label: 'Build Release APK',
      icon: 'package',
      tasks: combos.map(c => ({
        label:       c.label,
        command:     `assemble${c.taskSuffix}Release`,
        description: `assemble${c.taskSuffix}Release`,
      })),
    },
    {
      label: 'Build All',
      icon: 'layers',
      tasks: [
        { label: 'assembleDebug (semua flavor)',   command: 'assembleDebug' },
        { label: 'assembleRelease (semua flavor)', command: 'assembleRelease' },
        { label: 'clean',                          command: 'clean' },
      ],
    },
  ];
}
