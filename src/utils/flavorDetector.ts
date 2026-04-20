import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

export interface FlavorInfo {
  name: string;
  applicationId: string | null;
}

function getWorkspaceRoot(): string | null {
  return vscode.workspace.workspaceFolders?.[0].uri.fsPath ?? null;
}

function findAppBuildGradle(root: string): string | null {
  for (const fname of ['app/build.gradle.kts', 'app/build.gradle']) {
    const p = path.join(root, fname);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

// Parse productFlavors block dari Groovy atau Kotlin DSL
export function detectFlavors(): FlavorInfo[] {
  const root = getWorkspaceRoot();
  if (!root) return [];

  const buildGradlePath = findAppBuildGradle(root);
  if (!buildGradlePath) return [];

  const content = fs.readFileSync(buildGradlePath, 'utf-8');

  // Ekstrak blok productFlavors { ... }
  const blockMatch = content.match(/productFlavors\s*\{([\s\S]*?)\n\s*\}/);
  if (!blockMatch) return [];

  const block = blockMatch[1];
  const flavors: FlavorInfo[] = [];

  // Groovy DSL:
  //   timestamp { applicationId "com.example.app" }
  // Kotlin DSL:
  //   create("timestamp") { applicationId = "com.example.app" }
  const flavorPatterns = [
    // Groovy: flavorName {
    /(\w+)\s*\{([^}]*)\}/g,
    // Kotlin: create("flavorName") {
    /create\s*\(\s*["'](\w+)["']\s*\)\s*\{([^}]*)\}/g,
  ];

  for (const re of flavorPatterns) {
    let match: RegExpExecArray | null;
    re.lastIndex = 0;
    while ((match = re.exec(block)) !== null) {
      const name = match[1];
      if (['dimension', 'minSdk', 'targetSdk', 'versionCode', 'versionName'].includes(name)) continue;

      const body = match[2];
      const idMatch = body.match(/applicationId\s*[=]?\s*["']([^"']+)["']/);
      const applicationId = idMatch ? idMatch[1] : null;

      // Hindari duplikat
      if (!flavors.find(f => f.name === name)) {
        flavors.push({ name, applicationId });
      }
    }
    if (flavors.length > 0) break;
  }

  return flavors;
}

export interface GradleTaskGroup {
  label: string;
  icon: string;
  tasks: GradleTask[];
}

export interface GradleTask {
  label: string;
  command: string;       // gradle task, e.g. installTimestampDebug
  applicationId?: string;
  description?: string;
}

// Build daftar task berdasarkan flavor yang terdeteksi
export function buildTaskGroups(): GradleTaskGroup[] {
  const flavors = detectFlavors();
  const hasFlavors = flavors.length > 0;

  if (!hasFlavors) {
    // Tidak ada flavor — tampilkan task standar
    return [
      {
        label: 'Run',
        icon: 'play',
        tasks: [{ label: 'Install & Launch Debug', command: 'installDebug' }],
      },
      {
        label: 'Build Debug',
        icon: 'tools',
        tasks: [{ label: 'assembleDebug', command: 'assembleDebug' }],
      },
      {
        label: 'Build Release',
        icon: 'package',
        tasks: [{ label: 'assembleRelease', command: 'assembleRelease' }],
      },
      {
        label: 'Other',
        icon: 'gear',
        tasks: [{ label: 'clean', command: 'clean' }],
      },
    ];
  }

  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  return [
    {
      label: 'Run (Install + Launch)',
      icon: 'play',
      tasks: flavors.map(f => ({
        label: f.name,
        command: `install${capitalize(f.name)}Debug`,
        applicationId: f.applicationId ?? undefined,
        description: f.applicationId ?? undefined,
      })),
    },
    {
      label: 'Build Debug APK',
      icon: 'tools',
      tasks: flavors.map(f => ({
        label: f.name,
        command: `assemble${capitalize(f.name)}Debug`,
        description: `app/build/outputs/apk/${f.name}/debug/`,
      })),
    },
    {
      label: 'Build Release APK',
      icon: 'package',
      tasks: flavors.map(f => ({
        label: f.name,
        command: `assemble${capitalize(f.name)}Release`,
        description: `app/build/outputs/apk/${f.name}/release/`,
      })),
    },
    {
      label: 'Build All',
      icon: 'layers',
      tasks: [
        { label: 'assembleDebug (semua flavor)', command: 'assembleDebug' },
        { label: 'assembleRelease (semua flavor)', command: 'assembleRelease' },
        { label: 'clean', command: 'clean' },
      ],
    },
  ];
}
